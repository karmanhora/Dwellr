import type { PropertySummary } from "./property";

export type CollectionRole = "owner" | "editor" | "viewer";

export interface CollectionRow {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  share_slug: string;
  created_at: string;
  updated_at: string;
}

export interface CollectionItemRow {
  collection_id: string;
  property_id: string;
  added_by: string;
  note: string | null;
  created_at: string;
}

export interface PropertySaveRow {
  property_id: string;
  user_id: string;
  created_at: string;
}

export interface CollectionMemberRow {
  collection_id: string;
  user_id: string;
  role: CollectionRole;
  invited_by: string | null;
  joined_at: string;
}

export interface CollectionMemberProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface CollectionMember {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: CollectionRole;
  joinedAt: string;
}

export interface CollectionInviteRow {
  id: string;
  collection_id: string;
  invited_by: string;
  invitee_id: string | null;
  role: Exclude<CollectionRole, "owner">;
  max_uses: number;
  use_count: number;
  expires_at: string;
  revoked_at: string | null;
  declined_at: string | null;
  created_at: string;
}

export interface CollectionEvaluationRow {
  collection_id: string;
  property_id: string;
  user_id: string;
  rating: number;
  note: string | null;
  pros: string[];
  cons: string[];
  created_at: string;
  updated_at: string;
}

export interface CollectionEvaluation {
  propertyId: string;
  userId: string;
  rating: number;
  note: string | null;
  pros: string[];
  cons: string[];
  updatedAt: string;
}

export interface CollectionActivityRow {
  id: number;
  collection_id: string;
  actor_id: string | null;
  action: "member_joined" | "member_left" | "member_removed" | "item_added" | "item_removed" | "evaluation_saved";
  property_id: string | null;
  target_user_id: string | null;
  created_at: string;
}

export interface CollectionActivity {
  id: number;
  actorName: string;
  action: CollectionActivityRow["action"];
  propertyTitle: string | null;
  targetName: string | null;
  createdAt: string;
}

export interface Collection {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  shareSlug: string;
  itemCount: number;
  viewerRole?: CollectionRole;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionItem {
  propertyId: string;
  note: string | null;
  createdAt: string;
  property: PropertySummary;
}

export interface CollectionWithItems {
  collection: Collection;
  items: CollectionItem[];
}

export interface CollectionHomeComparison {
  property: PropertySummary;
  evaluations: CollectionEvaluation[];
  everyoneLikes: boolean;
  disagreement: boolean;
  averageRating: number | null;
}

export interface CollectionComparison {
  homes: CollectionHomeComparison[];
  memberCount: number;
  everyoneLikesCount: number;
  disagreementCount: number;
}
