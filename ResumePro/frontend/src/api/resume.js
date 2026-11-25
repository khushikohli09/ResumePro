// API helpers for resumes: list/view/delete/rename, AI analysis, and the resume builder.
// Each function calls the backend through the shared axios instance and returns only the useful part of the response.
import api from "./axios";

// Get all of the user's saved resumes.
export const listResumes = () => api.get("/resumes").then((r) => r.data.resumes);
// Get one resume by its id.
export const getResume = (id) => api.get(`/resumes/${id}`).then((r) => r.data.resume);
// Delete a resume by id.
export const deleteResume = (id) => api.delete(`/resumes/${id}`).then((r) => r.data);
// Rename a resume (PATCH updates only the title field).
export const renameResume = (id, title) =>
  api.patch(`/resumes/${id}`, { title }).then((r) => r.data.resume);

// Upload a resume file (PDF/DOC) for analysis, optionally with a job description to match against.
// onProgress (optional) is called with 0-100 so the UI can show an upload progress bar.
export const analyzeUpload = (file, jobDescription, onProgress) => {
  // FormData is how browsers send files; the file is sent as multipart/form-data.
  const form = new FormData();
  form.append("file", file);
  if (jobDescription) form.append("jobDescription", jobDescription);
  return api
    .post("/analyze/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
      // e.loaded / e.total = bytes sent so far / total bytes; converted to a percentage.
      onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / e.total)),
    })
    .then((r) => r.data.resume);
};

// Analyse resume text that was pasted in (no file upload).
export const analyzeText = (resumeText, jobDescription, title) =>
  api.post("/analyze/text", { resumeText, jobDescription, title }).then((r) => r.data.resume);

// Re-score an existing resume against a new job description.
export const rematchAgainstJob = (id, jobDescription) =>
  api.post(`/analyze/${id}/rematch`, { jobDescription }).then((r) => r.data.resume);

// Ask the AI to write resume bullet points from a rough description of the work.
export const generateBullets = (rawDescription, role) =>
  api.post("/builder/generate-bullets", { rawDescription, role }).then((r) => r.data.bullets);

// Ask the AI to write a professional summary from the target role, experience and skills.
export const generateSummary = (targetRole, yearsExperience, keySkills) =>
  api
    .post("/builder/generate-summary", { targetRole, yearsExperience, keySkills })
    .then((r) => r.data.summary);

// Save builder data: update an existing resume (PUT) if an id is given, otherwise create one (POST).
export const saveBuilderResume = (id, title, builderData) => {
  const req = id
    ? api.put(`/builder/${id}`, { title, builderData })
    : api.post("/builder", { title, builderData });
  return req.then((r) => r.data.resume);
};
