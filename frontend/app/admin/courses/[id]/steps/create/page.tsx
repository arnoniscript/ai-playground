import StepEditor from "@/components/step-editor";
import { Layout } from "@/components/layout";

export default function CreateStepPage({ params }: { params: { id: string } }) {
  return (
    <Layout>
      <StepEditor courseId={params.id} />
    </Layout>
  );
}
