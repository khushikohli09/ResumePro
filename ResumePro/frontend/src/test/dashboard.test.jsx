import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("../api/resume", () => ({ listResumes: vi.fn(), deleteResume: vi.fn(), renameResume: vi.fn() }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: { name: "Monica Gupta" } }) }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { listResumes, deleteResume, renameResume } from "../api/resume";
import Dashboard from "../pages/Dashboard";

const R = (over) => ({ _id: "x", title: "T", source: "uploaded", updatedAt: "2026-10-01T00:00:00Z", analysis: { overallScore: 80 }, ...over });
const DATA = [
  R({ _id: "a", title: "Backend CV", analysis: { overallScore: 80 } }),
  R({ _id: "b", title: "Weak CV", analysis: { overallScore: 60 } }),
  R({ _id: "c", title: "Built Resume", source: "builder", analysis: undefined }),
];

const show = () => render(<MemoryRouter><Dashboard /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  listResumes.mockResolvedValue(DATA);
  window.confirm = vi.fn(() => true);
});

describe("Dashboard", () => {
  it("shows a loading skeleton, then a personalised greeting", async () => {
    show();
    expect(screen.getByLabelText(/loading your dashboard/i)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(/Good (morning|afternoon|evening), Monica$/);
    expect(screen.queryByLabelText(/loading your dashboard/i)).not.toBeInTheDocument();
  });

  it("computes the stat cards from the resume list", async () => {
    show();
    const total = (await screen.findByText("Resumes")).closest("div").parentElement;
    expect(within(total).getByText("3")).toBeInTheDocument();
    const avg = screen.getByText("Average score").closest("div").parentElement;
    expect(within(avg).getByText("70")).toBeInTheDocument(); // (80 + 60) / 2
    const best = screen.getByText("Best score").closest("div").parentElement;
    expect(within(best).getByText("80")).toBeInTheDocument();
    const built = screen.getByText("Built in builder").closest("div").parentElement;
    expect(within(built).getByText("1")).toBeInTheDocument();
  });

  it("suggests fixing the lowest-scoring resume and links to the grammar tool for it", async () => {
    show();
    const link = await screen.findByRole("link", { name: /open grammar checker/i });
    expect(link).toHaveAttribute("href", "/tools/grammar?resume=b");
    expect(screen.getByLabelText(/"Weak CV" scores 60/)).toBeInTheDocument();
  });

  it("suggests building a roadmap when every score is healthy", async () => {
    listResumes.mockResolvedValue([R({ _id: "a", title: "Great CV", analysis: { overallScore: 92 } })]);
    show();
    expect(await screen.findByRole("link", { name: /build a roadmap/i })).toHaveAttribute("href", "/tools/roadmap?resume=a");
  });

  it("guides a brand-new user to upload, and shows the empty state", async () => {
    listResumes.mockResolvedValue([]);
    show();
    expect(await screen.findByRole("link", { name: /analyze a resume/i })).toHaveAttribute("href", "/analyze");
    expect(screen.getByText(/no resumes yet/i)).toBeInTheDocument();
  });

  it("renders an animated score ring only for scored resumes", async () => {
    show();
    await screen.findByText("Backend CV", { selector: "a" });
    expect(screen.getByRole("img", { name: "Score 80 out of 100" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Score 60 out of 100" })).toBeInTheDocument();
    expect(screen.queryAllByRole("img", { name: /^Score/ })).toHaveLength(2);
  });

  it("filters by search text and by source", async () => {
    const user = userEvent.setup();
    show();
    await screen.findByText("Weak CV", { selector: "a" });
    await user.type(screen.getByLabelText(/search resumes/i), "weak");
    expect(screen.queryByText("Backend CV", { selector: "a" })).not.toBeInTheDocument();
    expect(screen.getByText("Weak CV", { selector: "a" })).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/search resumes/i));
    await user.click(screen.getByRole("button", { name: "Built" }));
    expect(screen.getByText("Built Resume", { selector: "a" })).toBeInTheDocument();
    expect(screen.queryByText("Backend CV", { selector: "a" })).not.toBeInTheDocument();
  });

  it("shows a 'no match' state when the search finds nothing", async () => {
    const user = userEvent.setup();
    show();
    await user.type(await screen.findByLabelText(/search resumes/i), "zzz");
    expect(screen.getByText(/no resumes match/i)).toBeInTheDocument();
  });

  it("plays the exit animation, deletes, then reloads the list", async () => {
    const user = userEvent.setup();
    deleteResume.mockResolvedValue({});
    show();
    await screen.findByText("Weak CV", { selector: "a" });
    listResumes.mockResolvedValue(DATA.filter((r) => r._id !== "b"));
    const card = screen.getByText("Weak CV", { selector: "a" }).closest(".card-lift");
    await user.click(within(card).getByRole("button", { name: "Delete" }));
    expect(card).toHaveClass("leaving");
    await waitFor(() => expect(deleteResume).toHaveBeenCalledWith("b"));
    await waitFor(() => expect(screen.queryByText("Weak CV", { selector: "a" })).not.toBeInTheDocument());
  });

  it("does not delete when the confirmation is declined", async () => {
    const user = userEvent.setup();
    window.confirm = vi.fn(() => false);
    show();
    const card = (await screen.findByText("Weak CV", { selector: "a" })).closest(".card-lift");
    await user.click(within(card).getByRole("button", { name: "Delete" }));
    expect(deleteResume).not.toHaveBeenCalled();
    expect(card).not.toHaveClass("leaving");
  });

  it("renames a resume inline (Enter to save)", async () => {
    const user = userEvent.setup();
    renameResume.mockResolvedValue({});
    show();
    const card = (await screen.findByText("Weak CV", { selector: "a" })).closest(".card-lift");
    await user.click(within(card).getByRole("button", { name: "Rename" }));
    const input = within(card).getByRole("textbox");
    await user.clear(input);
    await user.type(input, "Improved CV{Enter}");
    await waitFor(() => expect(renameResume).toHaveBeenCalledWith("b", "Improved CV"));
  });

  it("offers an edit-in-builder link only for builder resumes", async () => {
    show();
    await screen.findByText("Built Resume", { selector: "a" });
    expect(screen.getAllByRole("link", { name: /edit in builder/i })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /edit in builder/i })).toHaveAttribute("href", "/builder/c");
  });
});
