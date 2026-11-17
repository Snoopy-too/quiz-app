import { useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Dialog,
  EmptyState,
  Field,
  Icon,
  IconButton,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Spinner,
  Textarea,
  useToast,
} from "../../components/ui";

export default function UiGallery() {
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sampleText, setSampleText] = useState("");
  const [sampleRole, setSampleRole] = useState("student");

  return (
    <div className="min-h-screen bg-canvas">
      <PageHeader
        title="UI Primitives Gallery"
        description="Development showcase for tokens, form controls, feedback components, and accessible surfaces."
        actions={
          <Button onClick={() => toast.success("Design system primitives active!")}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Trigger Toast
          </Button>
        }
      />

      <main id="main" className="mx-auto max-w-6xl space-y-8 p-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Buttons & Icon Buttons</h2>
          </CardHeader>
          <CardBody className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" loading>
              Loading
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <IconButton aria-label="Delete item" variant="secondary">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </IconButton>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Form Fields</h2>
          </CardHeader>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Quiz Title" hint="Visible to students in live sessions" required>
              <Input
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
                placeholder="e.g., Prepositions Practice"
              />
            </Field>
            <Field label="Email Address" error="Please enter a valid school email.">
              <Input type="email" defaultValue="invalid-email" />
            </Field>
            <Field label="Role">
              <Select value={sampleRole} onChange={(e) => setSampleRole(e.target.value)}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </Select>
            </Field>
            <Field label="Notes">
              <Textarea rows={2} placeholder="Optional instructions..." />
            </Field>
          </CardBody>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Badges, Icons & Loading</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="neutral">Neutral</Badge>
                <Badge variant="brand">Brand</Badge>
                <Badge variant="success">Approved</Badge>
                <Badge variant="warning">Pending</Badge>
                <Badge variant="danger">Overdue</Badge>
              </div>
              <div className="flex items-center gap-4 text-ink">
                <Icon name="classic" />
                <Icon name="bomb" />
                <Icon name="team" />
                <Icon name="assign" />
                <Icon name="celebrate" />
                <Icon name="google" />
                <Spinner label="Loading sample" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardBody>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDialogOpen(true)}>
                Open Dialog
              </Button>
            </CardFooter>
          </Card>

          <EmptyState
            icon={<Plus className="h-6 w-6" aria-hidden="true" />}
            title="No quizzes in this folder"
            description="Create a quiz from scratch or import a Kahoot-compatible CSV."
            primaryAction={{ label: "Create Quiz", onClick: () => toast.info("Create Quiz clicked") }}
            secondaryAction={{ label: "Browse Library", onClick: () => toast.info("Browse clicked") }}
          />
        </div>
      </main>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Sample Accessible Dialog"
        description="Built on the native <dialog> element with focus restoration and Escape support."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setDialogOpen(false);
                toast.success("Confirmed!");
              }}
            >
              Confirm
            </Button>
          </>
        }
      />
    </div>
  );
}
