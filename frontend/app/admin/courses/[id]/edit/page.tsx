import CourseEditor from "@/components/course-editor";
import { Layout } from "@/components/layout";

export default function EditCoursePage({ params }: { params: { id: string } }) {
  return (
    <Layout>
      <CourseEditor courseId={params.id} />
    </Layout>
  );
}
