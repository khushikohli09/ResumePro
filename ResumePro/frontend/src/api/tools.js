// API helpers for the extra AI tools (grammar, authenticity, LinkedIn, jobs, roadmap, portfolio).
import api from "./axios";

// Small helper: POST body to /tools/<path> and return just the response data.
const post = (path, body) => api.post(`/tools/${path}`, body).then((r) => r.data);

// Each tool below sends the resume input (plus any extra options) to its own endpoint.
export const checkGrammar = (input) => post("grammar", input);
export const checkAuthenticity = (input, jobDescription) => post("authenticity", { ...input, jobDescription });
export const getLinkedInSuggestions = (input, targetRole, tone) => post("linkedin", { ...input, targetRole, tone });
export const getJobRecommendations = (input) => post("jobs", input);
export const getRoadmap = (input, opts) => post("roadmap", { ...input, ...opts });
export const generatePortfolio = (body) => post("portfolio", body);
// Fetch the list of target roles (GET, so it doesn't use the post helper).
export const listRoles = () => api.get("/tools/roles").then((r) => r.data.roles);
