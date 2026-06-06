"use client";

import { useParams } from "next/navigation";
import ClassBuilder from "@/components/ClassBuilder";

export default function EditClassPage() {
  const { id } = useParams<{ id: string }>();
  return <ClassBuilder mode="edit" classId={id} />;
}
