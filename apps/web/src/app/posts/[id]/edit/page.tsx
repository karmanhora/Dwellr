import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { EditPostForm } from "@/components/posts/edit-post-form";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/lib/auth";
import { getPostById } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Edit post",
  robots: { index: false, follow: false },
};

type EditPostPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditPostPage({ params, searchParams }: EditPostPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/posts/${id}/edit`);

  const post = await getPostById(id);
  if (!post) notFound();
  if (post.author?.id !== user.id) notFound();

  const query = await searchParams;
  const removeProperty =
    (Array.isArray(query.removeProperty) ? query.removeProperty[0] : query.removeProperty) === "1";
  const propertyId = removeProperty ? null : post.propertyId;

  return (
    <Container size="narrow" className="py-10 sm:py-14">
      <p className="text-eyebrow text-stone uppercase">Edit post</p>
      <h1 className="mt-3 text-headline font-medium tracking-[-0.03em] sm:text-display">
        Edit the words and tags.
      </h1>
      <p className="mt-3 max-w-prose text-body leading-relaxed text-stone">
        Photos and video are immutable for now. Delete and repost if the media is wrong.
      </p>

      <div className="mt-10">
        <EditPostForm
          postId={post.id}
          kind={post.kind}
          caption={post.caption}
          categories={post.categories}
          propertyId={propertyId}
          propertyLabel={propertyId ? (post.property?.title ?? null) : null}
          neighborhood={post.neighborhood}
          city={post.city}
        />
      </div>
    </Container>
  );
}
