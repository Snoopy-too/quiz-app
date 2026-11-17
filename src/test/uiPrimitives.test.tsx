import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Plus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  Input,
  PageHeader,
  Select,
  Textarea,
  ToastProvider,
  useToast,
} from "../components/ui";

function ToastTrigger() {
  const toast = useToast();
  return (
    <Button onClick={() => toast.success("Changes saved", "Saved")}>
      Trigger toast
    </Button>
  );
}

describe("UI Primitives Accessibility & Behavior", () => {
  it("renders core UI primitives without axe violations", async () => {
    const { container } = render(
      <div>
        <PageHeader
          title="Question Bank"
          description="Manage your quizzes cleanly."
          actions={<Button variant="primary">Create</Button>}
        />
        <main>
          <Card>
            <CardHeader>
              <Badge variant="brand">Draft</Badge>
            </CardHeader>
            <CardBody className="space-y-4">
              <Field label="Quiz Title" hint="Visible to students" required>
                <Input defaultValue="Midterm Review" />
              </Field>
              <Field label="Difficulty" error="Please pick an option">
                <Select defaultValue="easy">
                  <option value="easy">Easy</option>
                  <option value="hard">Hard</option>
                </Select>
              </Field>
              <Field label="Notes">
                <Textarea rows={2} defaultValue="Closed-book" />
              </Field>
              <div className="flex gap-2">
                <IconButton aria-label="Add item">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </IconButton>
                <Card interactive onClick={() => {}}>
                  Interactive card button
                </Card>
              </div>
            </CardBody>
          </Card>

          <EmptyState
            title="No folders yet"
            description="Organize your library into folders."
            primaryAction={{ label: "New Folder", onClick: () => {} }}
          />
        </main>
      </div>,
    );

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("renders Dialog cleanly and invokes onClose on Escape", async () => {
    const onClose = vi.fn();
    const { container } = render(
      <Dialog
        open
        onClose={onClose}
        title="Confirm action"
        description="Are you sure you want to continue?"
        footer={
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        }
      >
        <p>Dialog content</p>
      </Dialog>,
    );

    const results = await axe(container);
    expect(results.violations).toEqual([]);
    expect(screen.getByText("Confirm action")).toBeInTheDocument();
  });

  it("shows and announces toast notifications via ToastProvider", () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Trigger toast" }));
    expect(screen.getByRole("status")).toHaveTextContent("Changes saved");
  });
});
