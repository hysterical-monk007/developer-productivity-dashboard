import { NextResponse } from "next/server";
import { getGithubToken, ghGraphQL, ghFetch, type GhUser } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CalResponse = {
  user: {
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: number;
        weeks: {
          contributionDays: {
            date: string;
            contributionCount: number;
            weekday: number;
          }[];
        }[];
      };
    };
  };
};

const QUERY = `query Contribs($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays { date contributionCount weekday }
        }
      }
    }
  }
}`;

function bucket(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 7) return 2;
  if (count <= 12) return 3;
  return 4;
}

export async function GET(req: Request) {
  const token = await getGithubToken(req);
  if (!token) {
    return NextResponse.json({ error: "not_linked" }, { status: 401 });
  }
  try {
    const me = await ghFetch<GhUser>(token, "/user");
    const data = await ghGraphQL<CalResponse>(token, QUERY, {
      login: me.login,
    });
    const cal = data.user.contributionsCollection.contributionCalendar;
    const cells = cal.weeks.flatMap((w) =>
      w.contributionDays.map((d) => ({
        iso: d.date,
        date: new Date(d.date).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        count: d.contributionCount,
        level: bucket(d.contributionCount),
        dow: d.weekday,
      }))
    );

    console.log(
      `[github/contributions] returning ${cells.length} cells, ${cal.totalContributions} total contributions`
    );
    return NextResponse.json(
      {
        cells,
        totalContributions: cal.totalContributions,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "github_error",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 502 }
    );
  }
}
