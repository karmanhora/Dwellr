/**
 * Anon / owner / stranger access suite for dwellr's Supabase schema.
 *
 * It runs against a disposable database (local Supabase in CI) using only the
 * public anon key: every check goes through PostgREST, Storage or Auth exactly
 * as a browser would. No service-role key is used, so the policies are what is
 * being tested, not a bypass.
 *
 * Run with `pnpm test:security` (starts from `supabase status`) or set
 * SUPABASE_TEST_URL and SUPABASE_TEST_ANON_KEY explicitly.
 */

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    "SUPABASE_TEST_URL and SUPABASE_TEST_ANON_KEY are required. Start local Supabase, then run `pnpm test:security`.",
  );
  process.exit(1);
}

const runId = Date.now().toString().slice(-9);
const password = "DwellrSecurity42";
const photoBucket = "property-photos";
const avatarBucket = "avatars";
const postPhotoBucket = "post-photos";
const postVideoBucket = "post-videos";

let failures = 0;
let checks = 0;

function check(name, ok, detail = "") {
  checks += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

function makeClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

const anon = makeClient();
const owner = makeClient();
const stranger = makeClient();
const viewer = makeClient();
const editor = makeClient();
const late = makeClient();

const accounts = { owner: null, stranger: null, viewer: null, editor: null, late: null };
let propertyId = null;
let strangerPropertyId = null;
let editorPropertyId = null;
let collectionId = null;
let firstCommentId = null;
let photoPath = null;
let avatarPath = null;
let postId = null;
let photoPostId = null;
let videoPostId = null;
let postPhotoPath = null;
let posterPath = null;
let videoPath = null;
let strangerPostId = null;
const uploadedPostPhotos = [];
const uploadedPostVideos = [];

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function uuid() {
  return crypto.randomUUID();
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function createInvite({
  role = "viewer",
  inviteeId = null,
  maxUses = 1,
  expiresInMs = 60 * 60 * 1000,
} = {}) {
  const token = `sec-${uuid()}`;
  const { data, error } = await owner
    .from("collection_invites")
    .insert({
      collection_id: collectionId,
      invited_by: accounts.owner.id,
      invitee_id: inviteeId,
      role,
      token_hash: tokenHash(token),
      max_uses: maxUses,
      expires_at: new Date(Date.now() + expiresInMs).toISOString(),
    })
    .select("id")
    .single();
  return { token, hash: tokenHash(token), id: data?.id ?? null, error };
}

async function signUp(client, label) {
  const email = `dwellr.security.${label}.${runId}@gmail.com`;
  const username = `sec${label}${runId.slice(-8)}`;
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { username, display_name: `Security ${label}` } },
  });
  if (error) throw new Error(`sign-up (${label}) failed: ${error.message}`);

  if (!data.session) {
    const signIn = await client.auth.signInWithPassword({ email, password });
    if (signIn.error) {
      throw new Error(
        `sign-up (${label}) returned no session and sign-in failed: ${signIn.error.message}. ` +
          "Local Supabase must have email confirmations disabled.",
      );
    }
    return signIn.data.user;
  }

  return data.user;
}

try {
  accounts.owner = await signUp(owner, "owner");
  accounts.stranger = await signUp(stranger, "stranger");
  accounts.viewer = await signUp(viewer, "viewer");
  accounts.editor = await signUp(editor, "editor");
  accounts.late = await signUp(late, "late");
  check(
    "five accounts sign up and receive sessions",
    Object.values(accounts).every((account) => Boolean(account?.id)),
  );

  // --- profiles ------------------------------------------------------------
  const publicProfiles = await anon
    .from("profiles")
    .select("id, username")
    .in("id", [accounts.owner.id, accounts.stranger.id]);
  check("anon reads public profiles", publicProfiles.data?.length === 2);

  const anonProfileInsert = await anon.from("profiles").insert({
    id: uuid(),
    username: `anon${runId.slice(-8)}`,
  });
  check("anon cannot insert a profile", Boolean(anonProfileInsert.error));

  const strangerProfileEscalation = await stranger
    .from("profiles")
    .update({ bio: "hijacked" })
    .eq("id", accounts.owner.id)
    .select("id");
  check("a stranger cannot update another profile", strangerProfileEscalation.data?.length === 0);

  const ownerProfileUpdate = await owner
    .from("profiles")
    .update({ bio: "Security suite profile." })
    .eq("id", accounts.owner.id)
    .select("bio")
    .single();
  check("an owner updates their own profile", ownerProfileUpdate.data?.bio === "Security suite profile.");

  const profileDelete = await owner.from("profiles").delete().eq("id", accounts.owner.id).select("id");
  const profileAfterDelete = await anon
    .from("profiles")
    .select("id")
    .eq("id", accounts.owner.id);
  check(
    "clients cannot delete profiles",
    (Boolean(profileDelete.error) || profileDelete.data?.length === 0) &&
      profileAfterDelete.data?.length === 1,
    profileDelete.error?.message,
  );

  // --- properties ----------------------------------------------------------
  const property = await owner
    .from("properties")
    .insert({
      created_by: accounts.owner.id,
      title: `Security suite home ${runId}`,
      neighborhood: "Test Heights",
      city: "Portland",
      listing_status: "unknown",
      property_type: "house",
      price_cents: 50_000_000,
    })
    .select("id")
    .single();
  if (property.error) throw new Error(`owner property insert failed: ${property.error.message}`);
  propertyId = property.data.id;

  const anonPropertyRead = await anon.from("properties").select("id").eq("id", propertyId);
  check("anon reads properties", anonPropertyRead.data?.length === 1);

  const anonPropertyInsert = await anon.from("properties").insert({
    created_by: accounts.owner.id,
    title: "Anon listing",
    neighborhood: "Test Heights",
    city: "Portland",
  });
  check("anon cannot create properties", Boolean(anonPropertyInsert.error));

  const forgedProperty = await stranger.from("properties").insert({
    created_by: accounts.owner.id,
    title: "Forged listing",
    neighborhood: "Test Heights",
    city: "Portland",
  });
  check("a stranger cannot create a property for someone else", Boolean(forgedProperty.error));

  const ownStrangerProperty = await stranger
    .from("properties")
    .insert({
      created_by: accounts.stranger.id,
      title: "Stranger listing",
      neighborhood: "Test Heights",
      city: "Portland",
    })
    .select("id")
    .single();
  check("a user can create their own property", !ownStrangerProperty.error);
  strangerPropertyId = ownStrangerProperty.data?.id ?? null;

  const strangerPropertyUpdate = await stranger
    .from("properties")
    .update({ title: "Hijacked listing" })
    .eq("id", propertyId)
    .select("id");
  check("a stranger cannot update another property", strangerPropertyUpdate.data?.length === 0);

  const strangerPropertyDelete = await stranger
    .from("properties")
    .delete()
    .eq("id", propertyId)
    .select("id");
  check("a stranger cannot delete another property", strangerPropertyDelete.data?.length === 0);

  // --- provenance ----------------------------------------------------------
  const provenance = await owner
    .from("property_field_provenance")
    .select("field, provenance, verified_at")
    .eq("property_id", propertyId);
  check(
    "every property fact starts as user_submitted",
    (provenance.data?.length ?? 0) >= 5 &&
      provenance.data.every((row) => row.provenance === "user_submitted" && row.verified_at === null),
    `${provenance.data?.length ?? 0} rows`,
  );

  const sourceRef = await anon
    .from("property_field_provenance")
    .select("source_ref")
    .eq("property_id", propertyId);
  check("clients cannot read provenance source_ref", Boolean(sourceRef.error), sourceRef.error?.code);

  const provenanceInsert = await owner.from("property_field_provenance").insert({
    property_id: propertyId,
    field: "title",
    provenance: "verified",
    verified_at: new Date().toISOString(),
  });
  check("clients cannot insert provenance", Boolean(provenanceInsert.error));

  const provenanceUpdate = await owner
    .from("property_field_provenance")
    .update({ provenance: "verified" })
    .eq("property_id", propertyId);
  check("clients cannot promote provenance", Boolean(provenanceUpdate.error));

  const provenanceDelete = await owner
    .from("property_field_provenance")
    .delete()
    .eq("property_id", propertyId);
  check("clients cannot delete provenance", Boolean(provenanceDelete.error));

  // --- observed price and status history -----------------------------------
  const initialPriceHistory = await anon
    .from("property_price_history")
    .select("price_cents, previous_price_cents")
    .eq("property_id", propertyId);
  check(
    "the initial price is recorded as observed",
    initialPriceHistory.data?.length === 1 && initialPriceHistory.data[0].previous_price_cents === null,
  );

  const historyInsert = await owner.from("property_price_history").insert({
    property_id: propertyId,
    price_cents: 1,
    currency: "USD",
  });
  check("clients cannot write price history", Boolean(historyInsert.error));

  const priceUpdate = await owner
    .from("properties")
    .update({ price_cents: 48_000_000 })
    .eq("id", propertyId)
    .select("id")
    .single();
  check("the owner changes the asking price", !priceUpdate.error, priceUpdate.error?.message);

  const priceHistory = await owner
    .from("property_price_history")
    .select("price_cents, previous_price_cents")
    .eq("property_id", propertyId)
    .order("recorded_at", { ascending: false })
    .order("id", { ascending: false });
  check(
    "the price change is captured with its previous value",
    priceHistory.data?.length === 2 &&
      priceHistory.data[0].price_cents === 48_000_000 &&
      priceHistory.data[0].previous_price_cents === 50_000_000,
    JSON.stringify(priceHistory.data?.[0] ?? null),
  );

  const statusUpdate = await owner
    .from("properties")
    .update({ listing_status: "sold" })
    .eq("id", propertyId)
    .select("id")
    .single();
  check("the owner changes the listing status", !statusUpdate.error, statusUpdate.error?.message);

  const statusHistory = await owner
    .from("property_status_history")
    .select("status, previous_status")
    .eq("property_id", propertyId)
    .order("recorded_at", { ascending: false })
    .order("id", { ascending: false });
  check(
    "the status change is captured with its previous value",
    statusHistory.data?.length === 2 &&
      statusHistory.data[0].status === "sold" &&
      statusHistory.data[0].previous_status === "unknown",
    JSON.stringify(statusHistory.data?.[0] ?? null),
  );

  const statusHistoryInsert = await owner.from("property_status_history").insert({
    property_id: propertyId,
    status: "for_sale",
  });
  check("clients cannot write status history", Boolean(statusHistoryInsert.error));

  const provenanceAfterEdit = await owner
    .from("property_field_provenance")
    .select("field, provenance")
    .eq("property_id", propertyId)
    .in("field", ["price", "listing_status"]);
  check(
    "editing facts leaves provenance user_submitted",
    (provenanceAfterEdit.data?.length ?? 0) === 2 &&
      provenanceAfterEdit.data.every((row) => row.provenance === "user_submitted"),
  );

  // --- confirmations -------------------------------------------------------
  const anonConfirmation = await anon.from("property_confirmations").insert({
    property_id: propertyId,
    confirmed_by: accounts.owner.id,
  });
  check("anon cannot confirm a listing", Boolean(anonConfirmation.error));

  const strangerConfirmation = await stranger.from("property_confirmations").insert({
    property_id: propertyId,
    confirmed_by: accounts.stranger.id,
  });
  check("a non-owner cannot confirm a listing", Boolean(strangerConfirmation.error));

  const ownerConfirmation = await owner.from("property_confirmations").insert({
    property_id: propertyId,
    confirmed_by: accounts.owner.id,
  });
  check("the poster confirms their listing", !ownerConfirmation.error, ownerConfirmation.error?.message);

  const publicConfirmation = await anon
    .from("property_confirmations")
    .select("confirmed_at")
    .eq("property_id", propertyId);
  check("confirmations are publicly readable", publicConfirmation.data?.length === 1);

  const confirmationUpdate = await owner
    .from("property_confirmations")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("property_id", propertyId);
  check("clients cannot edit confirmations", Boolean(confirmationUpdate.error));

  const confirmationDelete = await owner
    .from("property_confirmations")
    .delete()
    .eq("property_id", propertyId);
  check("clients cannot delete confirmations", Boolean(confirmationDelete.error));

  // --- property photos and storage ----------------------------------------
  photoPath = `${accounts.owner.id}/${uuid()}.png`;
  const photoUpload = await owner.storage
    .from(photoBucket)
    .upload(photoPath, png, { contentType: "image/png", upsert: false });
  check("an owner uploads under their own storage prefix", !photoUpload.error, photoUpload.error?.message);

  const foreignUpload = await stranger.storage
    .from(photoBucket)
    .upload(`${accounts.owner.id}/${uuid()}.png`, png, { contentType: "image/png" });
  check("a stranger cannot upload under someone else's prefix", Boolean(foreignUpload.error));

  const anonUpload = await anon.storage
    .from(photoBucket)
    .upload(`${accounts.owner.id}/${uuid()}.png`, png, { contentType: "image/png" });
  check("anon cannot upload property photos", Boolean(anonUpload.error));

  const photoRow = await owner
    .from("property_photos")
    .insert({ property_id: propertyId, storage_path: photoPath, position: 0 })
    .select("id")
    .single();
  check("the property owner can attach a photo row", !photoRow.error, photoRow.error?.message);

  const anonPhotoRead = await anon.from("property_photos").select("id").eq("property_id", propertyId);
  check("anon reads property photos", anonPhotoRead.data?.length === 1);

  const photoPathTrigger = await owner.from("property_photos").insert({
    property_id: propertyId,
    storage_path: `${accounts.stranger.id}/${uuid()}.png`,
    position: 1,
  });
  check("a photo path must belong to the property owner", Boolean(photoPathTrigger.error));

  const strangerPhotoInsert = await stranger.from("property_photos").insert({
    property_id: propertyId,
    storage_path: `${accounts.owner.id}/${uuid()}.png`,
    position: 2,
  });
  check("a stranger cannot attach photos to another property", Boolean(strangerPhotoInsert.error));

  const strangerPhotoUpdate = await stranger
    .from("property_photos")
    .update({ alt_text: "hijacked" })
    .eq("property_id", propertyId)
    .select("id");
  check("a stranger cannot update photo rows", strangerPhotoUpdate.data?.length === 0);

  const publicPhoto = await fetch(`${url}/storage/v1/object/public/${photoBucket}/${photoPath}`);
  check("property photos are publicly readable", publicPhoto.status === 200, `HTTP ${publicPhoto.status}`);

  const strangerRemove = await stranger.storage.from(photoBucket).remove([photoPath]);
  const photoAfterRemove = await fetch(`${url}/storage/v1/object/public/${photoBucket}/${photoPath}`);
  check(
    "a stranger cannot delete another owner's object",
    photoAfterRemove.status === 200,
    `HTTP ${photoAfterRemove.status}; remove error: ${strangerRemove.error?.message ?? "none"}`,
  );

  avatarPath = `${accounts.owner.id}/${uuid()}.png`;
  const avatarUpload = await owner.storage
    .from(avatarBucket)
    .upload(avatarPath, png, { contentType: "image/png" });
  check("an owner uploads an avatar", !avatarUpload.error);
  const publicAvatar = await fetch(`${url}/storage/v1/object/public/${avatarBucket}/${avatarPath}`);
  check("avatars are publicly readable", publicAvatar.status === 200, `HTTP ${publicAvatar.status}`);

  // --- collections ---------------------------------------------------------
  const slug = `${runId}${Math.random().toString(36).slice(2)}`
    .replace(/[^a-z0-9]/g, "")
    .padEnd(12, "0")
    .slice(0, 12);

  const collection = await owner
    .from("collections")
    .insert({
      owner_id: accounts.owner.id,
      name: `Security collection ${runId}`,
      is_public: false,
      share_slug: slug,
    })
    .select("id")
    .single();
  if (collection.error) throw new Error(`collection insert failed: ${collection.error.message}`);
  collectionId = collection.data.id;

  const anonPrivateCollection = await anon.from("collections").select("id").eq("id", collectionId);
  check("anon cannot read a private collection", anonPrivateCollection.data?.length === 0);

  const strangerPrivateCollection = await stranger
    .from("collections")
    .select("id")
    .eq("id", collectionId);
  check("a stranger cannot read a private collection", strangerPrivateCollection.data?.length === 0);

  const strangerCollectionInsert = await stranger.from("collections").insert({
    owner_id: accounts.owner.id,
    name: "Forged collection",
    share_slug: `${slug.slice(0, 11)}a`,
  });
  check("a stranger cannot create a collection for someone else", Boolean(strangerCollectionInsert.error));

  const anonCollectionInsert = await anon.from("collections").insert({
    owner_id: accounts.owner.id,
    name: "Anon collection",
    share_slug: `${slug.slice(0, 11)}b`,
  });
  check("anon cannot create collections", Boolean(anonCollectionInsert.error));

  const strangerCollectionUpdate = await stranger
    .from("collections")
    .update({ name: "Hijacked" })
    .eq("id", collectionId)
    .select("id");
  check("a stranger cannot rename a collection", strangerCollectionUpdate.data?.length === 0);

  const ownerItem = await owner.from("collection_items").insert({
    collection_id: collectionId,
    property_id: propertyId,
    added_by: accounts.owner.id,
    note: "Owner note.",
  });
  check("an owner adds a home to their collection", !ownerItem.error, ownerItem.error?.message);

  const strangerItemInsert = await stranger.from("collection_items").insert({
    collection_id: collectionId,
    property_id: propertyId,
    added_by: accounts.stranger.id,
  });
  check("a stranger cannot add items to a collection", Boolean(strangerItemInsert.error));

  const strangerPrivateItems = await stranger
    .from("collection_items")
    .select("property_id")
    .eq("collection_id", collectionId);
  check("a stranger cannot read private collection items", strangerPrivateItems.data?.length === 0);

  const ownerItemUpdate = await owner
    .from("collection_items")
    .update({ note: "Updated owner note." })
    .eq("collection_id", collectionId)
    .eq("property_id", propertyId)
    .select("note")
    .single();
  check("an owner updates their collection item", ownerItemUpdate.data?.note === "Updated owner note.");

  const strangerItemUpdate = await stranger
    .from("collection_items")
    .update({ note: "Hijacked" })
    .eq("collection_id", collectionId)
    .eq("property_id", propertyId)
    .select("note");
  check("a stranger cannot update collection items", strangerItemUpdate.data?.length === 0);

  const strangerCollectionDelete = await stranger
    .from("collections")
    .delete()
    .eq("id", collectionId)
    .select("id");
  check("a stranger cannot delete a collection", strangerCollectionDelete.data?.length === 0);

  const stillThere = await owner
    .from("collections")
    .select("name")
    .eq("id", collectionId)
    .single();
  check("the collection survives foreign writes", stillThere.data?.name === `Security collection ${runId}`);

  // --- collaboration roles, evaluations and invites -----------------------
  const editorProperty = await owner
    .from("properties")
    .insert({
      created_by: accounts.owner.id,
      title: `Collaboration home ${runId}`,
      neighborhood: "Test Heights",
      city: "Portland",
      property_type: "house",
    })
    .select("id")
    .single();
  if (editorProperty.error) {
    throw new Error(`editor property insert failed: ${editorProperty.error.message}`);
  }
  editorPropertyId = editorProperty.data.id;

  const ownerEvaluation = await owner.from("collection_item_evaluations").insert({
    collection_id: collectionId,
    property_id: propertyId,
    user_id: accounts.owner.id,
    rating: 4,
    note: "Owner's private note.",
    pros: ["Light"],
    cons: ["Street noise"],
  });
  check("the owner writes an evaluation", !ownerEvaluation.error, ownerEvaluation.error?.message);

  const strangerEvaluationRead = await stranger
    .from("collection_item_evaluations")
    .select("rating, note")
    .eq("collection_id", collectionId);
  check("a non-member cannot read evaluations", strangerEvaluationRead.data?.length === 0);

  const viewerInvite = await createInvite({ role: "viewer", inviteeId: accounts.viewer.id });
  if (viewerInvite.error) throw new Error(`viewer invite failed: ${viewerInvite.error.message}`);

  const hashedTokenRead = await owner
    .from("collection_invites")
    .select("token_hash")
    .eq("id", viewerInvite.id);
  check(
    "invite token hashes are not readable",
    Boolean(hashedTokenRead.error) || hashedTokenRead.data?.length === 0,
    hashedTokenRead.error?.message,
  );

  const inviteMetadata = await viewer
    .from("collection_invites")
    .select("id, role, invitee_id")
    .eq("id", viewerInvite.id);
  check("an invitee reads their invite metadata", inviteMetadata.data?.length === 1);

  const viewerPending = await viewer.rpc("get_my_pending_invites");
  check(
    "the pending-invite RPC returns the caller's active invite",
    (viewerPending.data ?? []).some((invite) => invite.id === viewerInvite.id),
    viewerPending.error?.message,
  );
  const strangerPending = await stranger.rpc("get_my_pending_invites");
  check("the pending-invite RPC does not leak another invitee's invite", strangerPending.data?.length === 0);

  const strangerInviteRead = await stranger
    .from("collection_invites")
    .select("id")
    .eq("id", viewerInvite.id);
  check("a non-invitee cannot read the invite", strangerInviteRead.data?.length === 0);

  const viewerAccept = await viewer.rpc("accept_collection_invite", {
    p_token_hash: viewerInvite.hash,
  });
  check(
    "an invitee accepts a hashed invite",
    !viewerAccept.error && viewerAccept.data === collectionId,
    viewerAccept.error?.message,
  );

  const viewerMembership = await viewer
    .from("collection_members")
    .select("role")
    .eq("collection_id", collectionId)
    .eq("user_id", accounts.viewer.id)
    .single();
  check("the accepted invite creates a viewer membership", viewerMembership.data?.role === "viewer");

  const viewerPendingAfterAccept = await viewer.rpc("get_my_pending_invites");
  check(
    "an accepted invite disappears from pending invites",
    !(viewerPendingAfterAccept.data ?? []).some((invite) => invite.id === viewerInvite.id),
  );

  const viewerCollectionRead = await viewer
    .from("collections")
    .select("id")
    .eq("id", collectionId);
  check("a viewer reads the private collection", viewerCollectionRead.data?.length === 1);

  const viewerEvaluationRead = await viewer
    .from("collection_item_evaluations")
    .select("rating")
    .eq("collection_id", collectionId);
  check("a viewer reads evaluations", viewerEvaluationRead.data?.length === 1);

  const viewerEvaluationInsert = await viewer.from("collection_item_evaluations").insert({
    collection_id: collectionId,
    property_id: propertyId,
    user_id: accounts.viewer.id,
    rating: 5,
  });
  check("a viewer cannot write an evaluation", Boolean(viewerEvaluationInsert.error));

  const viewerItemInsert = await viewer.from("collection_items").insert({
    collection_id: collectionId,
    property_id: editorPropertyId,
    added_by: accounts.viewer.id,
  });
  check("a viewer cannot add a home", Boolean(viewerItemInsert.error));

  const viewerItemUpdate = await viewer
    .from("collection_items")
    .update({ note: "Viewer rewrite" })
    .eq("collection_id", collectionId)
    .eq("property_id", propertyId)
    .select("note");
  check("a viewer cannot update an item", viewerItemUpdate.data?.length === 0);

  const viewerCollectionUpdate = await viewer
    .from("collections")
    .update({ name: "Viewer rewrite" })
    .eq("id", collectionId)
    .select("id");
  check("a viewer cannot rename the collection", viewerCollectionUpdate.data?.length === 0);

  const viewerRoleUpdate = await viewer
    .from("collection_members")
    .update({ role: "editor" })
    .eq("collection_id", collectionId)
    .eq("user_id", accounts.viewer.id)
    .select("role");
  check("a viewer cannot promote themselves", viewerRoleUpdate.data?.length === 0);

  const viewerInviteInsert = await viewer.from("collection_invites").insert({
    collection_id: collectionId,
    invited_by: accounts.viewer.id,
    role: "viewer",
    token_hash: tokenHash(`viewer-${uuid()}`),
    max_uses: 1,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  });
  check("a viewer cannot create invites", Boolean(viewerInviteInsert.error));

  const ownerPromotion = await owner
    .from("collection_members")
    .update({ role: "editor" })
    .eq("collection_id", collectionId)
    .eq("user_id", accounts.viewer.id)
    .select("role")
    .single();
  check("the owner promotes a viewer to editor", ownerPromotion.data?.role === "editor");

  const editorInvite = await createInvite({ role: "editor", inviteeId: accounts.editor.id });
  if (editorInvite.error) throw new Error(`editor invite failed: ${editorInvite.error.message}`);
  const editorAccept = await editor.rpc("accept_collection_invite_by_id", {
    p_invite_id: editorInvite.id,
  });
  check("a second editor accepts their named invite", !editorAccept.error, editorAccept.error?.message);

  const editorItemInsert = await editor
    .from("collection_items")
    .insert({
      collection_id: collectionId,
      property_id: editorPropertyId,
      added_by: accounts.editor.id,
      note: "Editor's addition.",
    });
  check("an editor adds a home", !editorItemInsert.error, editorItemInsert.error?.message);

  const editorItemUpdate = await editor
    .from("collection_items")
    .update({ note: "Editor's note." })
    .eq("collection_id", collectionId)
    .eq("property_id", editorPropertyId)
    .select("note")
    .single();
  check("an editor updates an item", editorItemUpdate.data?.note === "Editor's note.");

  const editorEvaluation = await editor.from("collection_item_evaluations").insert({
    collection_id: collectionId,
    property_id: editorPropertyId,
    user_id: accounts.editor.id,
    rating: 3,
  });
  check("an editor writes an evaluation", !editorEvaluation.error, editorEvaluation.error?.message);

  const editorCollectionUpdate = await editor
    .from("collections")
    .update({ name: "Editor rewrite" })
    .eq("id", collectionId)
    .select("id");
  check("an editor cannot manage the collection", editorCollectionUpdate.data?.length === 0);

  const editorRoleUpdate = await editor
    .from("collection_members")
    .update({ role: "owner" })
    .eq("collection_id", collectionId)
    .eq("user_id", accounts.viewer.id)
    .select("role");
  check("an editor cannot change roles", editorRoleUpdate.data?.length === 0);

  const editorOwnerDemotion = await editor
    .from("collection_members")
    .update({ role: "viewer" })
    .eq("collection_id", collectionId)
    .eq("user_id", accounts.owner.id)
    .select("role");
  check("an editor cannot demote the owner", editorOwnerDemotion.data?.length === 0);

  const editorInviteInsert = await editor.from("collection_invites").insert({
    collection_id: collectionId,
    invited_by: accounts.editor.id,
    role: "viewer",
    token_hash: tokenHash(`editor-${uuid()}`),
    max_uses: 1,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  });
  check("an editor cannot create invites", Boolean(editorInviteInsert.error));

  const ownerDelete = await owner
    .from("collection_members")
    .delete()
    .eq("collection_id", collectionId)
    .eq("user_id", accounts.owner.id)
    .select("user_id");
  check("the owner membership cannot be removed", Boolean(ownerDelete.error));

  const ownerDemotion = await owner
    .from("collection_members")
    .update({ role: "viewer" })
    .eq("collection_id", collectionId)
    .eq("user_id", accounts.owner.id)
    .select("role");
  check("the owner membership cannot be demoted", Boolean(ownerDemotion.error));

  const ownershipTransfer = await owner
    .from("collections")
    .update({ owner_id: accounts.stranger.id })
    .eq("id", collectionId)
    .select("owner_id");
  check("collection ownership cannot be transferred", Boolean(ownershipTransfer.error));

  const directAcceptInvite = await createInvite({ inviteeId: accounts.stranger.id });
  if (directAcceptInvite.error) {
    throw new Error(`direct invite failed: ${directAcceptInvite.error.message}`);
  }
  const wrongDirectAccept = await owner.rpc("accept_collection_invite_by_id", {
    p_invite_id: directAcceptInvite.id,
  });
  check("a named invite can only be accepted by its invitee", Boolean(wrongDirectAccept.error));
  const directAccept = await stranger.rpc("accept_collection_invite_by_id", {
    p_invite_id: directAcceptInvite.id,
  });
  check("a named invite is accepted without exposing a token", !directAccept.error, directAccept.error?.message);
  const directReuse = await stranger.rpc("accept_collection_invite_by_id", {
    p_invite_id: directAcceptInvite.id,
  });
  check("a used named invite cannot be accepted twice", Boolean(directReuse.error));

  const lateInvite = await createInvite({ inviteeId: accounts.late.id });
  if (lateInvite.error) throw new Error(`late invite failed: ${lateInvite.error.message}`);
  const lateAccept = await late.rpc("accept_collection_invite", { p_token_hash: lateInvite.hash });
  check("a one-use invite can be accepted", !lateAccept.error, lateAccept.error?.message);
  const lateReuse = await late.rpc("accept_collection_invite", { p_token_hash: lateInvite.hash });
  check("a used one-use invite cannot be reused", Boolean(lateReuse.error));

  const revokedInvite = await createInvite({ inviteeId: accounts.stranger.id });
  if (revokedInvite.error) throw new Error(`revoked invite setup failed: ${revokedInvite.error.message}`);
  const revoke = await owner
    .from("collection_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", revokedInvite.id)
    .select("revoked_at")
    .single();
  check("the owner revokes an invite", Boolean(revoke.data?.revoked_at), revoke.error?.message);
  const revokedAccept = await stranger.rpc("accept_collection_invite", {
    p_token_hash: revokedInvite.hash,
  });
  check("a revoked invite cannot be accepted", Boolean(revokedAccept.error));

  const directInvite = await stranger.from("collection_invites").insert({
    collection_id: collectionId,
    invited_by: accounts.stranger.id,
    role: "viewer",
    token_hash: tokenHash(`direct-${uuid()}`),
    max_uses: 1,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  });
  check("a non-owner cannot create a direct invite", Boolean(directInvite.error));

  const expiringInvite = await createInvite({
    inviteeId: accounts.stranger.id,
    expiresInMs: 1000,
  });
  if (expiringInvite.error) throw new Error(`expiring invite failed: ${expiringInvite.error.message}`);
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const expiredAccept = await stranger.rpc("accept_collection_invite", {
    p_token_hash: expiringInvite.hash,
  });
  check("an expired invite cannot be accepted", Boolean(expiredAccept.error));

  const publish = await owner
    .from("collections")
    .update({ is_public: true })
    .eq("id", collectionId)
    .select("is_public")
    .single();
  check("the owner publishes the collection", publish.data?.is_public === true, publish.error?.message);

  const anonPublicCollection = await anon
    .from("collections")
    .select("id")
    .eq("share_slug", slug);
  check("anon reads a published collection", anonPublicCollection.data?.length === 1);

  const anonPublicItems = await anon
    .from("collection_items")
    .select("property_id, note")
    .eq("collection_id", collectionId);
  check("anon reads items of a published collection", (anonPublicItems.data?.length ?? 0) >= 2);

  const ownerItemDelete = await owner
    .from("collection_items")
    .delete()
    .eq("collection_id", collectionId)
    .eq("property_id", propertyId)
    .select("property_id");
  check("the owner removes a collection item", ownerItemDelete.data?.length === 1);

  // --- saves ---------------------------------------------------------------
  const anonSaves = await anon.from("property_saves").select("property_id");
  check("anon has no access to saves", Boolean(anonSaves.error), anonSaves.error?.code);

  const ownerSave = await owner
    .from("property_saves")
    .insert({ property_id: propertyId, user_id: accounts.owner.id });
  check("an owner saves a home", !ownerSave.error, ownerSave.error?.message);

  const ownerSaves = await owner.from("property_saves").select("property_id");
  check("an owner reads their own save", ownerSaves.data?.length === 1);

  const strangerSaves = await stranger.from("property_saves").select("property_id");
  check("a stranger cannot read someone else's save", strangerSaves.data?.length === 0);

  const strangerSaveDelete = await stranger
    .from("property_saves")
    .delete()
    .eq("property_id", propertyId)
    .select("property_id");
  check("a stranger cannot delete someone else's save", strangerSaveDelete.data?.length === 0);

  const ownerSaveDelete = await owner
    .from("property_saves")
    .delete()
    .eq("property_id", propertyId)
    .select("property_id");
  check("the saver removes their own save", ownerSaveDelete.data?.length === 1);

  // --- social graph: likes, comments, follows, notifications and blocks ----
  const initialLikes = await anon
    .from("content_like_counts")
    .select("like_count")
    .eq("target_type", "property")
    .eq("target_id", propertyId)
    .maybeSingle();
  check("anon reads a zero like count", (initialLikes.data?.like_count ?? 0) === 0);

  const strangerLike = await stranger.from("content_likes").insert({
    user_id: accounts.stranger.id,
    target_type: "property",
    target_id: propertyId,
  });
  check("a signed-in user likes a property", !strangerLike.error, strangerLike.error?.message);

  const duplicateLike = await stranger.from("content_likes").insert({
    user_id: accounts.stranger.id,
    target_type: "property",
    target_id: propertyId,
  });
  check("a user cannot like the same target twice", Boolean(duplicateLike.error));

  const forgedLike = await stranger.from("content_likes").insert({
    user_id: accounts.owner.id,
    target_type: "property",
    target_id: propertyId,
  });
  check("a client cannot like as another user", Boolean(forgedLike.error));

  const anonLike = await anon.from("content_likes").insert({
    user_id: accounts.stranger.id,
    target_type: "property",
    target_id: propertyId,
  });
  check("anon cannot like", Boolean(anonLike.error));

  const viewerLike = await viewer.from("content_likes").insert({
    user_id: accounts.viewer.id,
    target_type: "property",
    target_id: propertyId,
  });
  check("a second user likes the same property", !viewerLike.error, viewerLike.error?.message);

  const likeCount = await anon
    .from("content_like_counts")
    .select("like_count")
    .eq("target_type", "property")
    .eq("target_id", propertyId)
    .maybeSingle();
  check("the like count is derived from rows", likeCount.data?.like_count === 2);

  const likeNotification = await owner
    .from("notifications")
    .select("id, actor_count, read_at")
    .eq("type", "like")
    .eq("target_id", propertyId)
    .maybeSingle();
  check(
    "likes collapse into one unread notification",
    likeNotification.data?.actor_count === 2 && likeNotification.data?.read_at === null,
    JSON.stringify(likeNotification.data),
  );

  const actorIdsRead = await owner
    .from("notifications")
    .select("actor_ids")
    .eq("id", likeNotification.data?.id ?? 0);
  check(
    "notification actor_ids are not exposed",
    Boolean(actorIdsRead.error) || actorIdsRead.data?.length === 0,
    actorIdsRead.error?.message,
  );

  const strangerNotifications = await stranger
    .from("notifications")
    .select("id")
    .eq("id", likeNotification.data?.id ?? 0);
  check("a user cannot read another user's notifications", strangerNotifications.data?.length === 0);

  const forgedNotification = await owner.from("notifications").insert({
    user_id: accounts.owner.id,
    type: "follow",
    actor_id: accounts.stranger.id,
  });
  check("clients cannot forge notifications", Boolean(forgedNotification.error));

  const selfFollow = await owner.from("follows").insert({
    follower_id: accounts.owner.id,
    following_id: accounts.owner.id,
  });
  check("a user cannot follow themselves", Boolean(selfFollow.error));

  const forgedFollow = await stranger.from("follows").insert({
    follower_id: accounts.owner.id,
    following_id: accounts.stranger.id,
  });
  check("a user cannot follow as someone else", Boolean(forgedFollow.error));

  const strangerFollow = await stranger.from("follows").insert({
    follower_id: accounts.stranger.id,
    following_id: accounts.owner.id,
  });
  check("a user follows another user", !strangerFollow.error, strangerFollow.error?.message);

  const followCounts = await anon
    .from("profile_follow_counts")
    .select("follower_count")
    .eq("user_id", accounts.owner.id)
    .maybeSingle();
  check("follower counts include the new follow", (followCounts.data?.follower_count ?? 0) >= 1);

  const followNotification = await owner
    .from("notifications")
    .select("id")
    .eq("type", "follow");
  check("a follow creates a notification", (followNotification.data?.length ?? 0) >= 1);

  const strangerComment = await stranger
    .from("comments")
    .insert({
      target_type: "property",
      target_id: propertyId,
      author_id: accounts.stranger.id,
      body: "Security suite comment.",
    })
    .select("id")
    .single();
  check("a signed-in user comments", !strangerComment.error, strangerComment.error?.message);
  firstCommentId = strangerComment.data?.id ?? null;

  const anonCommentRead = await anon
    .from("comments")
    .select("body")
    .eq("id", firstCommentId);
  check("comments are publicly readable", anonCommentRead.data?.length === 1);

  const forgedComment = await stranger.from("comments").insert({
    target_type: "property",
    target_id: propertyId,
    author_id: accounts.owner.id,
    body: "Forged comment.",
  });
  check("a user cannot comment as someone else", Boolean(forgedComment.error));

  const ownerReply = await owner
    .from("comments")
    .insert({
      target_type: "property",
      target_id: propertyId,
      author_id: accounts.owner.id,
      parent_id: firstCommentId,
      body: "Owner reply.",
    })
    .select("id")
    .single();
  check("an owner replies to a comment", !ownerReply.error, ownerReply.error?.message);

  const nestedReply = await stranger.from("comments").insert({
    target_type: "property",
    target_id: propertyId,
    author_id: accounts.stranger.id,
    parent_id: ownerReply.data?.id,
    body: "Too deep.",
  });
  check("comments only nest one level", Boolean(nestedReply.error));

  const commentBodyEdit = await stranger
    .from("comments")
    .update({ body: "Rewritten." })
    .eq("id", firstCommentId)
    .select("body");
  check("comment bodies are immutable", Boolean(commentBodyEdit.error));

  const commentNotification = await owner
    .from("notifications")
    .select("id")
    .eq("type", "comment")
    .eq("comment_id", firstCommentId);
  check("a comment creates a notification", (commentNotification.data?.length ?? 0) === 1);

  const strangerDeleteOwnerComment = await stranger
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", ownerReply.data?.id)
    .select("id");
  check("a stranger cannot delete someone else's comment", strangerDeleteOwnerComment.data?.length === 0);

  const report = await stranger
    .from("reports")
    .insert({
      reporter_id: accounts.stranger.id,
      target_type: "comment",
      target_id: firstCommentId,
      reason: "harassment",
      details: "Security suite report.",
    })
    .select("id, status")
    .single();
  check("a user reports a comment", !report.error, report.error?.message);
  check("a new report starts open", report.data?.status === "open");

  const ownerReportRead = await owner.from("reports").select("id").eq("id", report.data?.id);
  check("a user cannot read another reporter's report", ownerReportRead.data?.length === 0);

  const anonReport = await anon.from("reports").insert({
    reporter_id: accounts.stranger.id,
    target_type: "property",
    target_id: propertyId,
    reason: "spam",
  });
  check("anon cannot report", Boolean(anonReport.error));

  const invalidReport = await stranger.from("reports").insert({
    reporter_id: accounts.stranger.id,
    target_type: "property",
    target_id: uuid(),
    reason: "spam",
  });
  check("reports require an existing target", Boolean(invalidReport.error));

  const reportStatusUpdate = await stranger
    .from("reports")
    .update({ status: "dismissed", resolved_at: new Date().toISOString() })
    .eq("id", report.data?.id)
    .select("id");
  check("reporters cannot resolve their own reports", Boolean(reportStatusUpdate.error) || reportStatusUpdate.data?.length === 0);

  const ownerDeleteStrangerComment = await owner
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", firstCommentId)
    .select("body, deleted_at")
    .single();
  check(
    "a content owner soft-deletes a comment into a tombstone",
    ownerDeleteStrangerComment.data?.body === "" && Boolean(ownerDeleteStrangerComment.data?.deleted_at),
    ownerDeleteStrangerComment.error?.message,
  );

  const reportAfterSoftDelete = await stranger
    .from("reports")
    .select("id")
    .eq("id", report.data?.id);
  check(
    "soft-deleting a comment keeps the report for moderation",
    reportAfterSoftDelete.data?.length === 1,
  );

  await stranger.from("follows").delete().eq("follower_id", accounts.stranger.id);
  const refollow = await stranger.from("follows").insert({
    follower_id: accounts.stranger.id,
    following_id: accounts.owner.id,
  });
  check("a user can follow again", !refollow.error, refollow.error?.message);

  const preferences = await stranger
    .from("feed_preferences")
    .upsert({
      user_id: accounts.stranger.id,
      neighborhoods: ["Test Heights"],
      property_types: ["house"],
    })
    .select("neighborhoods")
    .single();
  check("a user saves feed preferences", preferences.data?.neighborhoods?.[0] === "Test Heights", preferences.error?.message);

  const strangerFeed = await stranger
    .from("feed_properties")
    .select("id, relevance")
    .eq("id", propertyId)
    .maybeSingle();
  check(
    "the feed includes followed homes with relevance",
    strangerFeed.data?.id === propertyId && strangerFeed.data.relevance >= 2,
    JSON.stringify(strangerFeed.data),
  );

  const foreignPreferences = await owner
    .from("feed_preferences")
    .select("user_id")
    .eq("user_id", accounts.stranger.id);
  check("feed preferences are private", foreignPreferences.data?.length === 0);

  const anonFeed = await anon.from("feed_properties").select("id").eq("id", propertyId);
  check("anon cannot read the personalized feed", Boolean(anonFeed.error) || anonFeed.data?.length === 0);

  // A block hides both directions and stops new interactions.
  await stranger.from("follows").delete().eq("follower_id", accounts.stranger.id);
  const strangerBlock = await stranger.from("blocks").insert({
    blocker_id: accounts.stranger.id,
    blocked_id: accounts.owner.id,
  });
  check("a user blocks another account", !strangerBlock.error, strangerBlock.error?.message);

  const blockedProperty = await stranger.from("properties").select("id").eq("id", propertyId);
  check("a blocked user's property disappears", blockedProperty.data?.length === 0);

  const blockedProfile = await stranger
    .from("profiles")
    .select("id")
    .eq("id", accounts.owner.id);
  check("a blocked user's profile disappears", blockedProfile.data?.length === 0);

  const ownerSeesStranger = await owner
    .from("profiles")
    .select("id")
    .eq("id", accounts.stranger.id);
  check("blocking hides the blocker in both directions", ownerSeesStranger.data?.length === 0);

  const anonStillSees = await anon.from("properties").select("id").eq("id", propertyId);
  check("a block does not hide public content from anon", anonStillSees.data?.length === 1);

  const blockedComment = await stranger.from("comments").insert({
    target_type: "property",
    target_id: propertyId,
    author_id: accounts.stranger.id,
    body: "Blocked comment.",
  });
  check("a blocked user cannot comment", Boolean(blockedComment.error));

  const blockedFollow = await stranger
    .from("follows")
    .insert({ follower_id: accounts.stranger.id, following_id: accounts.owner.id });
  check("a blocked user cannot follow", Boolean(blockedFollow.error));

  const blockedLike = await stranger.from("content_likes").insert({
    user_id: accounts.stranger.id,
    target_type: "property",
    target_id: editorPropertyId,
  });
  check("a blocked user cannot like the blocker's content", Boolean(blockedLike.error));

  const ownerComments = await owner
    .from("comments")
    .select("author_id")
    .eq("target_id", propertyId);
  check(
    "comments from a blocked user are hidden from the blocker",
    (ownerComments.data ?? []).every((row) => row.author_id !== accounts.stranger.id),
    JSON.stringify(ownerComments.data),
  );

  const blockList = await stranger.from("blocks").select("blocked_id");
  check("a user reads their own block list", blockList.data?.length === 1);
  const foreignBlockList = await owner.from("blocks").select("blocked_id");
  check("a user cannot read someone else's block list", foreignBlockList.data?.length === 0);

  const unblock = await stranger
    .from("blocks")
    .delete()
    .eq("blocker_id", accounts.stranger.id)
    .eq("blocked_id", accounts.owner.id);
  check("a user unblocks", !unblock.error, unblock.error?.message);

  const visibleAgain = await stranger.from("properties").select("id").eq("id", propertyId);
  check("unblocking restores visibility", visibleAgain.data?.length === 1);

  // The database, not the UI, is the rate limiter.
  let rateLimitError = null;
  for (let index = 0; index < 11; index += 1) {
    const result = await stranger.from("comments").insert({
      target_type: "property",
      target_id: propertyId,
      author_id: accounts.stranger.id,
      body: `Rate limit comment ${index}.`,
    });
    if (result.error) {
      rateLimitError = result.error;
      break;
    }
  }
  check(
    "commenting faster than ten a minute is rejected",
    Boolean(rateLimitError) && /too quickly/i.test(rateLimitError.message),
    rateLimitError?.message,
  );

  // --- posts and short video ------------------------------------------------
  const anonPost = await anon.from("posts").insert({
    author_id: accounts.owner.id,
    kind: "text",
    caption: "Anon post",
  });
  check("anon cannot insert a post directly", Boolean(anonPost.error));

  const directPost = await owner.from("posts").insert({
    author_id: accounts.owner.id,
    kind: "text",
    caption: "Bypassing the RPC",
  });
  check("even an author cannot bypass create_post()", Boolean(directPost.error));

  const textPost = await owner.rpc("create_post", {
    p_kind: "text",
    p_caption: `Security post ${runId}`,
    p_categories: ["interiors"],
    p_property_id: propertyId,
    p_neighborhood: "Test Heights",
    p_city: "Portland",
    p_photos: [],
    p_video: null,
  });
  check("an author publishes a text post through create_post", !textPost.error, textPost.error?.message);
  postId = textPost.data;

  const anonPostRead = await anon.from("posts").select("id, kind").eq("id", postId).maybeSingle();
  check("anon reads a live post", anonPostRead.data?.id === postId);

  const strangerPostEdit = await stranger
    .from("posts")
    .update({ caption: "Hijacked" })
    .eq("id", postId)
    .select("id");
  check("a stranger cannot edit another author's post", strangerPostEdit.data?.length === 0);

  const ownPostEdit = await owner
    .from("posts")
    .update({ caption: `Edited security post ${runId}` })
    .eq("id", postId)
    .select("caption")
    .single();
  check("an author edits their own post", ownPostEdit.data?.caption?.startsWith("Edited"));

  const identityEdit = await owner
    .from("posts")
    .update({ kind: "video" })
    .eq("id", postId)
    .select("id");
  check("post kind is immutable", Boolean(identityEdit.error) || identityEdit.data?.length === 0);

  postPhotoPath = `${accounts.owner.id}/${uuid()}.png`;
  const postPhotoUpload = await owner.storage
    .from(postPhotoBucket)
    .upload(postPhotoPath, png, { contentType: "image/png", upsert: false });
  check("an owner uploads a post photo under their prefix", !postPhotoUpload.error, postPhotoUpload.error?.message);
  if (!postPhotoUpload.error) uploadedPostPhotos.push(postPhotoPath);

  const outsidePath = `${accounts.owner.id}/${uuid()}.png`;
  const outsideUpload = await stranger.storage
    .from(postPhotoBucket)
    .upload(outsidePath, png, { contentType: "image/png", upsert: false });
  check("a user cannot upload a post photo outside their own prefix", Boolean(outsideUpload.error));

  const wrongMime = await owner.storage
    .from(postPhotoBucket)
    .upload(`${accounts.owner.id}/${uuid()}.pdf`, Buffer.from("%PDF-1.4"), {
      contentType: "application/pdf",
      upsert: false,
    });
  check("the post-photo bucket rejects a non-image MIME type", Boolean(wrongMime.error));

  const oversizePhoto = await owner.storage
    .from(postPhotoBucket)
    .upload(`${accounts.owner.id}/${uuid()}.png`, Buffer.alloc(5 * 1024 * 1024 + 1), {
      contentType: "image/png",
      upsert: false,
    });
  check("the post-photo bucket rejects files over 5 MB", Boolean(oversizePhoto.error));

  const photoPost = await owner.rpc("create_post", {
    p_kind: "photo",
    p_caption: `Photo security post ${runId}`,
    p_categories: ["before_after"],
    p_property_id: null,
    p_neighborhood: null,
    p_city: null,
    p_photos: [
      {
        storagePath: postPhotoPath,
        width: 1,
        height: 1,
        sizeBytes: png.length,
        altText: "One pixel",
      },
    ],
    p_video: null,
  });
  check("an author publishes a photo post", !photoPost.error, photoPost.error?.message);
  photoPostId = photoPost.data;

  const directPhotoRow = await owner.from("post_photos").insert({
    post_id: photoPost.data ?? uuid(),
    storage_path: `${accounts.owner.id}/${uuid()}.png`,
    position: 0,
    size_bytes: png.length,
  });
  check("clients cannot insert post_photos rows directly", Boolean(directPhotoRow.error));

  const tooManyPhotos = await owner.rpc("create_post", {
    p_kind: "photo",
    p_caption: "Nine photos",
    p_categories: [],
    p_property_id: null,
    p_neighborhood: null,
    p_city: null,
    p_photos: Array.from({ length: 9 }, () => ({
      storagePath: `${accounts.owner.id}/${uuid()}.png`,
      width: 1,
      height: 1,
      sizeBytes: png.length,
    })),
    p_video: null,
  });
  check("a photo post cannot carry nine photos", Boolean(tooManyPhotos.error));

  const foreignPhotoPath = await stranger.rpc("create_post", {
    p_kind: "photo",
    p_caption: "Someone else's photo",
    p_categories: [],
    p_property_id: null,
    p_neighborhood: null,
    p_city: null,
    p_photos: [
      {
        storagePath: `${accounts.owner.id}/${uuid()}.png`,
        width: 1,
        height: 1,
        sizeBytes: png.length,
      },
    ],
    p_video: null,
  });
  check("a user cannot attach another account's photo path", Boolean(foreignPhotoPath.error));

  videoPath = `${accounts.owner.id}/${uuid()}.webm`;
  const videoUpload = await owner.storage
    .from(postVideoBucket)
    .upload(videoPath, Buffer.from("webm-test"), { contentType: "video/webm", upsert: false });
  check("an owner uploads a video under their prefix", !videoUpload.error, videoUpload.error?.message);
  if (!videoUpload.error) uploadedPostVideos.push(videoPath);

  const outsideVideo = await stranger.storage
    .from(postVideoBucket)
    .upload(`${accounts.owner.id}/${uuid()}.webm`, Buffer.from("webm-test"), {
      contentType: "video/webm",
      upsert: false,
    });
  check("a user cannot upload a video outside their own prefix", Boolean(outsideVideo.error));

  const wrongVideoMime = await owner.storage
    .from(postVideoBucket)
    .upload(`${accounts.owner.id}/${uuid()}.mov`, Buffer.from("mov-test"), {
      contentType: "video/quicktime",
      upsert: false,
    });
  check("the video bucket rejects unsupported MIME types", Boolean(wrongVideoMime.error));

  posterPath = `${accounts.owner.id}/${uuid()}.webp`;
  const posterUpload = await owner.storage
    .from(postPhotoBucket)
    .upload(posterPath, Buffer.from("poster-test"), { contentType: "image/webp", upsert: false });
  if (!posterUpload.error) uploadedPostPhotos.push(posterPath);

  const validVideo = {
    storagePath: videoPath,
    posterPath,
    durationSeconds: 12.5,
    width: 720,
    height: 1280,
    sizeBytes: Buffer.from("webm-test").length,
    mimeType: "video/webm",
  };

  const longVideo = await owner.rpc("create_post", {
    p_kind: "video",
    p_caption: "Too long",
    p_categories: [],
    p_property_id: null,
    p_neighborhood: null,
    p_city: null,
    p_photos: [],
    p_video: { ...validVideo, durationSeconds: 30.1 },
  });
  check("a video over 30 seconds is rejected", Boolean(longVideo.error));

  const heavyVideo = await owner.rpc("create_post", {
    p_kind: "video",
    p_caption: "Too heavy",
    p_categories: [],
    p_property_id: null,
    p_neighborhood: null,
    p_city: null,
    p_photos: [],
    p_video: { ...validVideo, sizeBytes: 26214401 },
  });
  check("a video over 25 MB is rejected by create_post", Boolean(heavyVideo.error));

  const foreignPoster = await owner.rpc("create_post", {
    p_kind: "video",
    p_caption: "Foreign poster",
    p_categories: [],
    p_property_id: null,
    p_neighborhood: null,
    p_city: null,
    p_photos: [],
    p_video: { ...validVideo, posterPath: `${accounts.stranger.id}/${uuid()}.webp` },
  });
  check("a video poster must belong to the author", Boolean(foreignPoster.error));

  const videoPost = await owner.rpc("create_post", {
    p_kind: "video",
    p_caption: `Video security post ${runId}`,
    p_categories: ["walkthrough"],
    p_property_id: propertyId,
    p_neighborhood: null,
    p_city: null,
    p_photos: [],
    p_video: validVideo,
  });
  check("an author publishes a video post", !videoPost.error, videoPost.error?.message);
  videoPostId = videoPost.data;

  const directVideoRow = await owner.from("videos").insert({
    post_id: videoPostId ?? uuid(),
    author_id: accounts.owner.id,
    storage_path: videoPath,
    poster_path: posterPath,
    duration_seconds: 10,
    width: 720,
    height: 1280,
    size_bytes: 10,
    mime_type: "video/webm",
  });
  check("clients cannot insert videos rows directly", Boolean(directVideoRow.error));

  const usageRead = await owner
    .from("user_media_usage")
    .select("photo_bytes, video_bytes")
    .eq("user_id", accounts.owner.id)
    .maybeSingle();
  check(
    "media usage tracks the published photo and video",
    Number(usageRead.data?.photo_bytes ?? 0) >= png.length &&
      Number(usageRead.data?.video_bytes ?? 0) >= validVideo.sizeBytes,
    JSON.stringify(usageRead.data),
  );
  const foreignUsage = await stranger
    .from("user_media_usage")
    .select("user_id")
    .eq("user_id", accounts.owner.id);
  check("media usage is private", foreignUsage.data?.length === 0);

  const reportPost = await stranger.from("reports").insert({
    reporter_id: accounts.stranger.id,
    target_type: "post",
    target_id: postId,
    reason: "personal_information",
  });
  check("a post can be reported for personal or identifying information", !reportPost.error, reportPost.error?.message);

  // Blocked users disappear from posts, watch and media rows.
  strangerPostId = (
    await stranger.rpc("create_post", {
      p_kind: "text",
      p_caption: `Blocked post ${runId}`,
      p_categories: [],
      p_property_id: null,
      p_neighborhood: null,
      p_city: null,
      p_photos: [],
      p_video: null,
    })
  ).data;

  await owner.from("blocks").insert({
    blocker_id: accounts.owner.id,
    blocked_id: accounts.stranger.id,
  });
  const blockedPostRead = await owner.from("posts").select("id").eq("id", strangerPostId);
  check("a blocked user's post is hidden from the blocker", blockedPostRead.data?.length === 0);
  const blockedWatch = await owner
    .from("watch_posts")
    .select("post_id")
    .eq("post_id", strangerPostId);
  check("a blocked user's post is absent from /watch ranking", blockedWatch.data?.length === 0);
  const ownerVideoPostForStranger = await stranger.from("posts").select("id").eq("id", videoPostId);
  check("a block hides posts in both directions", ownerVideoPostForStranger.data?.length === 0);
  await owner
    .from("blocks")
    .delete()
    .eq("blocker_id", accounts.owner.id)
    .eq("blocked_id", accounts.stranger.id);

  // Rate limit: ten posts per hour, enforced by the database.
  let postRateError = null;
  const ratePostIds = [];
  for (let index = 0; index < 12; index += 1) {
    const result = await owner.rpc("create_post", {
      p_kind: "text",
      p_caption: `Rate post ${index} ${runId}`,
      p_categories: [],
      p_property_id: null,
      p_neighborhood: null,
      p_city: null,
      p_photos: [],
      p_video: null,
    });
    if (result.error) {
      postRateError = result.error;
      break;
    }
    ratePostIds.push(result.data);
  }
  check(
    "publishing more than ten posts an hour is rejected",
    Boolean(postRateError) && /ten posts an hour/i.test(postRateError.message),
    postRateError?.message,
  );
  for (const id of ratePostIds) await owner.rpc("soft_delete_post", { p_post_id: id });

  const strangerDelete = await stranger.rpc("soft_delete_post", { p_post_id: postId });
  check("a stranger cannot soft-delete another author's post", Boolean(strangerDelete.error));

  const anonDelete = await anon.rpc("soft_delete_post", { p_post_id: postId });
  check("anon cannot soft-delete a post", Boolean(anonDelete.error));

  const ownerDeletePost = await owner.rpc("soft_delete_post", { p_post_id: postId });
  check("an author soft-deletes their own post", !ownerDeletePost.error, ownerDeletePost.error?.message);
  const deletedPostRead = await anon.from("posts").select("id").eq("id", postId);
  check("a soft-deleted post is hidden even from anon", deletedPostRead.data?.length === 0);
  const deletedPostComments = await anon
    .from("comments")
    .select("id")
    .eq("target_type", "post")
    .eq("target_id", postId);
  check("comments on a soft-deleted post are hidden", deletedPostComments.data?.length === 0);

  const ownerDeletePhotoPost = await owner.rpc("soft_delete_post", { p_post_id: photoPostId });
  check("an author deletes a photo post", !ownerDeletePhotoPost.error, ownerDeletePhotoPost.error?.message);

  const retainedPostReport = await stranger
    .from("reports")
    .select("id, target_type")
    .eq("target_id", postId);
  check(
    "a report survives a soft-deleted post for moderation",
    retainedPostReport.data?.length === 1,
    JSON.stringify(retainedPostReport.data),
  );

  const ownerDeleteVideo = await owner.rpc("soft_delete_post", { p_post_id: videoPostId });
  check("an author deletes a video post", !ownerDeleteVideo.error, ownerDeleteVideo.error?.message);
  const deletedVideoRead = await anon.from("videos").select("id").eq("post_id", videoPostId);
  check("video rows disappear with a deleted post", deletedVideoRead.data?.length === 0);

  const usageAfterDelete = await owner
    .from("user_media_usage")
    .select("photo_bytes, video_bytes")
    .eq("user_id", accounts.owner.id)
    .maybeSingle();
  check(
    "deleting posts releases media quota",
    Number(usageAfterDelete.data?.photo_bytes ?? 0) === 0 &&
      Number(usageAfterDelete.data?.video_bytes ?? 0) === 0,
    JSON.stringify(usageAfterDelete.data),
  );

  // --- cascades ------------------------------------------------------------
  const deleteStrangerProperty = await stranger
    .from("properties")
    .delete()
    .eq("id", strangerPropertyId)
    .select("id");
  check("a user deletes their own property", deleteStrangerProperty.data?.length === 1);
  strangerPropertyId = null;

  const deleteProperty = await owner
    .from("properties")
    .delete()
    .eq("id", propertyId)
    .select("id");
  check("an owner deletes their own property", deleteProperty.data?.length === 1);

  const photosAfterDelete = await anon
    .from("property_photos")
    .select("id")
    .eq("property_id", property.data.id);
  check("photo rows cascade with the property", photosAfterDelete.data?.length === 0);

  const historyAfterDelete = await anon
    .from("property_price_history")
    .select("id")
    .eq("property_id", property.data.id);
  check("price history cascades with the property", historyAfterDelete.data?.length === 0);

  const socialLikesAfterDelete = await anon
    .from("content_likes")
    .select("user_id")
    .eq("target_id", property.data.id);
  check("likes are cleaned up with the property", socialLikesAfterDelete.data?.length === 0);

  const socialCommentsAfterDelete = await anon
    .from("comments")
    .select("id")
    .eq("target_id", property.data.id);
  check("comments are cleaned up with the property", socialCommentsAfterDelete.data?.length === 0);

  const socialNotificationsAfterDelete = await owner
    .from("notifications")
    .select("id")
    .eq("target_id", property.data.id);
  check("notifications are cleaned up with the property", socialNotificationsAfterDelete.data?.length === 0);

  const commentReportsAfterDelete = await stranger
    .from("reports")
    .select("id")
    .eq("target_id", property.data.id);
  check(
    "reports are cleaned up when their property target is deleted",
    commentReportsAfterDelete.data?.length === 0,
  );

  const confirmationsAfterDelete = await anon
    .from("property_confirmations")
    .select("id")
    .eq("property_id", property.data.id);
  check("confirmations cascade with the property", confirmationsAfterDelete.data?.length === 0);
  propertyId = null;

  const deleteEditorProperty = await owner
    .from("properties")
    .delete()
    .eq("id", editorPropertyId)
    .select("id");
  check("the owner deletes the collaboration property", deleteEditorProperty.data?.length === 1);
  editorPropertyId = null;

  const deleteCollection = await owner
    .from("collections")
    .delete()
    .eq("id", collectionId)
    .select("id");
  check("an owner deletes their own collection", deleteCollection.data?.length === 1);
  collectionId = null;
} catch (error) {
  failures += 1;
  console.error("ERROR", error instanceof Error ? error.message : error);
} finally {
  if (collectionId) await owner.from("collections").delete().eq("id", collectionId);
  if (strangerPropertyId) await stranger.from("properties").delete().eq("id", strangerPropertyId);
  if (editorPropertyId) await owner.from("properties").delete().eq("id", editorPropertyId);
  if (propertyId) await owner.from("properties").delete().eq("id", propertyId);
  if (strangerPostId) await stranger.rpc("soft_delete_post", { p_post_id: strangerPostId });
  if (postId) await owner.rpc("soft_delete_post", { p_post_id: postId });
  if (photoPostId) await owner.rpc("soft_delete_post", { p_post_id: photoPostId });
  if (videoPostId) await owner.rpc("soft_delete_post", { p_post_id: videoPostId });
  if (photoPath) await owner.storage.from(photoBucket).remove([photoPath]);
  if (avatarPath) await owner.storage.from(avatarBucket).remove([avatarPath]);
  if (uploadedPostPhotos.length > 0) {
    await owner.storage.from(postPhotoBucket).remove(uploadedPostPhotos);
  }
  if (uploadedPostVideos.length > 0) {
    await owner.storage.from(postVideoBucket).remove(uploadedPostVideos);
  }
}

console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
