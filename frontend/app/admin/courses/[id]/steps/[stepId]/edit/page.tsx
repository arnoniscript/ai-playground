import StepEditor from "@/components/step-editor";
import { Layout } from "@/components/layout";

export default function EditStepPage({
  params,
}: {
  params: { id: string; stepId: string };
}) {
  return (
    <Layout>
      <StepEditor courseId={params.id} stepId={params.stepId} />
    </Layout>
  );
}
