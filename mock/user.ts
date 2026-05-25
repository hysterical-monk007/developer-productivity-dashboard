export const currentUser = {
  id: "alex-chen",
  username: "alexchen",
  name: "Alex Chen",
  role: "Senior Software Engineer",
  email: "alex@pulse.dev",
  avatar: "AC",
  avatarColor: "from-violet-500 to-fuchsia-500",
  bio: "Building dev tools. TypeScript, Go, Rust.",
  joined: "2022-03-14",
  location: "San Francisco, CA",
  company: "Pulse Labs",
};

export type User = typeof currentUser;
