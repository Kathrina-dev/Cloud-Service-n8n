export interface JobState {
  id: string;
  status: string;
  isComplete: boolean;
  error?: string;
}

// In-memory store for demo purposes. 
// In production, this would be Redis or a database.
const jobs = new Map<string, JobState>();

export const jobStore = {
  createJob: (id: string, initialStatus: string) => {
    jobs.set(id, { id, status: initialStatus, isComplete: false });
  },
  updateStatus: (id: string, status: string) => {
    const job = jobs.get(id);
    if (job) {
      job.status = status;
      jobs.set(id, job);
    }
  },
  completeJob: (id: string, finalStatus: string) => {
    const job = jobs.get(id);
    if (job) {
      job.status = finalStatus;
      job.isComplete = true;
      jobs.set(id, job);
    }
  },
  failJob: (id: string, error: string) => {
    const job = jobs.get(id);
    if (job) {
      job.status = 'Failed';
      job.error = error;
      job.isComplete = true;
      jobs.set(id, job);
    }
  },
  getJob: (id: string): JobState | undefined => {
    return jobs.get(id);
  }
};
