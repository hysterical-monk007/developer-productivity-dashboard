export type TeamMember = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  avatarColor: string;
  role: string;
  commits: number;
  prsMerged: number;
  reviewsGiven: number;
  delta: number;
};

export const team: TeamMember[] = [
  {
    id: "alex-chen",
    name: "Alex Chen",
    username: "alexchen",
    avatar: "AC",
    avatarColor: "from-violet-500 to-fuchsia-500",
    role: "Senior Engineer",
    commits: 287,
    prsMerged: 42,
    reviewsGiven: 61,
    delta: 12,
  },
  {
    id: "maya-patel",
    name: "Maya Patel",
    username: "mayap",
    avatar: "MP",
    avatarColor: "from-emerald-500 to-teal-500",
    role: "Staff Engineer",
    commits: 312,
    prsMerged: 48,
    reviewsGiven: 78,
    delta: 8,
  },
  {
    id: "jordan-kim",
    name: "Jordan Kim",
    username: "jkim",
    avatar: "JK",
    avatarColor: "from-amber-500 to-orange-500",
    role: "Engineer",
    commits: 198,
    prsMerged: 31,
    reviewsGiven: 44,
    delta: -3,
  },
  {
    id: "rin-suzuki",
    name: "Rin Suzuki",
    username: "rinsuzuki",
    avatar: "RS",
    avatarColor: "from-sky-500 to-blue-500",
    role: "Senior Engineer",
    commits: 241,
    prsMerged: 37,
    reviewsGiven: 52,
    delta: 5,
  },
  {
    id: "diego-ortiz",
    name: "Diego Ortiz",
    username: "dortiz",
    avatar: "DO",
    avatarColor: "from-rose-500 to-pink-500",
    role: "Engineer",
    commits: 156,
    prsMerged: 24,
    reviewsGiven: 38,
    delta: 18,
  },
];
