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

const accounts = { owner: null, stranger: null };
let propertyId = null;
let strangerPropertyId = null;
let collectionId = null;
let photoPath = null;
let avatarPath = null;

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function uuid() {
  return crypto.randomUUID();
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
  check("two accounts sign up and receive sessions", Boolean(accounts.owner?.id && accounts.stranger?.id));

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
  check("anon reads items of a published collection", anonPublicItems.data?.length === 1);

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

  const confirmationsAfterDelete = await anon
    .from("property_confirmations")
    .select("id")
    .eq("property_id", property.data.id);
  check("confirmations cascade with the property", confirmationsAfterDelete.data?.length === 0);
  propertyId = null;

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
  if (propertyId) await owner.from("properties").delete().eq("id", propertyId);
  if (photoPath) await owner.storage.from(photoBucket).remove([photoPath]);
  if (avatarPath) await owner.storage.from(avatarBucket).remove([avatarPath]);
}

console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
