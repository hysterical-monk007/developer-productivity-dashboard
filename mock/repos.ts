export type Repo = {
  id: string;
  name: string;
  description: string;
  language: string;
  languageColor: string;
  stars: number;
  forks: number;
  commitsThisWeek: number;
  openPRs: number;
  openIssues: number;
  lastPush: string;
  isPrivate: boolean;
};

export const repos: Repo[] = [
  {
    id: "payments-service",
    name: "payments-service",
    description: "Stripe-based billing & subscription engine.",
    language: "Go",
    languageColor: "#00ADD8",
    stars: 124,
    forks: 18,
    commitsThisWeek: 47,
    openPRs: 6,
    openIssues: 9,
    lastPush: "2h ago",
    isPrivate: true,
  },
  {
    id: "web-app",
    name: "web-app",
    description: "Next.js dashboard for Pulse customers.",
    language: "TypeScript",
    languageColor: "#3178c6",
    stars: 89,
    forks: 12,
    commitsThisWeek: 62,
    openPRs: 11,
    openIssues: 7,
    lastPush: "20m ago",
    isPrivate: true,
  },
  {
    id: "api-gateway",
    name: "api-gateway",
    description: "GraphQL gateway across microservices.",
    language: "TypeScript",
    languageColor: "#3178c6",
    stars: 56,
    forks: 8,
    commitsThisWeek: 23,
    openPRs: 4,
    openIssues: 3,
    lastPush: "1d ago",
    isPrivate: true,
  },
  {
    id: "mobile-ios",
    name: "mobile-ios",
    description: "iOS client. SwiftUI + Combine.",
    language: "Swift",
    languageColor: "#F05138",
    stars: 34,
    forks: 4,
    commitsThisWeek: 12,
    openPRs: 2,
    openIssues: 5,
    lastPush: "3d ago",
    isPrivate: true,
  },
  {
    id: "infra-terraform",
    name: "infra-terraform",
    description: "AWS infrastructure as code.",
    language: "HCL",
    languageColor: "#844FBA",
    stars: 18,
    forks: 2,
    commitsThisWeek: 8,
    openPRs: 1,
    openIssues: 2,
    lastPush: "5h ago",
    isPrivate: true,
  },
  {
    id: "design-system",
    name: "design-system",
    description: "Shared React components & tokens.",
    language: "TypeScript",
    languageColor: "#3178c6",
    stars: 71,
    forks: 9,
    commitsThisWeek: 15,
    openPRs: 3,
    openIssues: 4,
    lastPush: "6h ago",
    isPrivate: false,
  },
];
