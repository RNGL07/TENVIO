import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { endChallengeAction } from "@/actions/challenge-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, ProgressBar } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { PlusIcon, SparkIcon } from "@/components/icons";
import { terminologyFor } from "@/lib/terminology";

export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: { created?: string; ended?: string; error?: string };
}) {
  const { business } = await requireSession();
  const terms = terminologyFor(business.industry);
  const now = new Date();

  const challenges = await prisma.challenge.findMany({
    where: { businessId: business.id },
    include: {
      progress: { select: { count: true, completedAt: true } },
      _count: { select: { progress: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const running = challenges.filter((c) => c.active && c.startsAt <= now && c.endsAt >= now);
  const other = challenges.filter((c) => !running.includes(c));

  function statusOf(c: (typeof challenges)[number]) {
    if (!c.active) return { label: "Ended early", tone: "neutral" as const };
    if (c.startsAt > now) return { label: "Scheduled", tone: "orange" as const };
    if (c.endsAt < now) return { label: "Finished", tone: "neutral" as const };
    return { label: "Running", tone: "green" as const };
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Challenges</h1>
          <p className="text-fade text-sm mt-0.5">
            A goal with a deadline — complete {terms.activityPlural} in a window, earn something extra.
          </p>
        </div>
        <LinkButton href="/dashboard/challenges/new">
          <PlusIcon className="w-4 h-4" /> New Challenge
        </LinkButton>
      </div>

      {searchParams.created && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3.5 py-2.5 mb-5">
          Challenge created. It starts counting {terms.activityPlural} on its start date.
        </div>
      )}
      {searchParams.ended && (
        <div className="bg-brand-50 border border-brand-200 text-brand-800 text-sm rounded-lg px-3.5 py-2.5 mb-5">
          Challenge ended. Anyone who already completed it keeps their reward.
        </div>
      )}
      {searchParams.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-2.5 mb-5 break-words">
          {searchParams.error}
        </div>
      )}

      {challenges.length === 0 ? (
        <div className="bg-white border border-sand rounded-xl px-5 py-10 text-center">
          <div className="w-11 h-11 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
            <SparkIcon className="w-5 h-5" />
          </div>
          <p className="text-ink font-semibold text-sm mb-1">No challenges yet</p>
          <p className="text-fade text-sm mb-4 max-w-sm mx-auto">
            Challenges run alongside your normal loyalty program — someone can be working toward both at once. Good for
            filling a slow month with a deadline.
          </p>
          <LinkButton href="/dashboard/challenges/new" size="sm">
            Create your first challenge
          </LinkButton>
        </div>
      ) : (
        <div className="space-y-6">
          {[
            { title: "Running now", items: running },
            { title: "Scheduled, finished & ended", items: other },
          ]
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <div key={group.title}>
                <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">{group.title}</p>
                <div className="space-y-3">
                  {group.items.map((c) => {
                    const status = statusOf(c);
                    const completedCount = c.progress.filter((p) => p.completedAt).length;
                    const participants = c._count.progress;
                    // Average progress across everyone who has started, so a
                    // challenge nobody has touched doesn't read as 0% of a
                    // full bar — it reads as "no one started yet".
                    const avg =
                      participants > 0
                        ? c.progress.reduce((s, p) => s + Math.min(p.count, c.targetCount), 0) / participants
                        : 0;
                    return (
                      <Card key={c.id}>
                        <CardContent className="p-5">
                          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 mb-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-ink font-semibold break-words">{c.name}</span>
                                <Badge tone={status.tone}>{status.label}</Badge>
                              </div>
                              <div className="text-fade text-xs mt-1 break-words">
                                {c.targetCount} {c.targetCount === 1 ? terms.activity : terms.activityPlural} → {c.rewardDescription}
                              </div>
                              <div className="text-fade text-xs mt-0.5">
                                {c.startsAt.toLocaleDateString()} – {c.endsAt.toLocaleDateString()}
                              </div>
                              {c.description && (
                                <div className="text-fade text-xs mt-1 break-words">{c.description}</div>
                              )}
                            </div>
                            {c.active && c.endsAt >= now && (
                              <form action={endChallengeAction}>
                                <input type="hidden" name="challengeId" value={c.id} />
                                <Button type="submit" variant="ghost" size="sm">
                                  End early
                                </Button>
                              </form>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-sand text-center">
                            <div>
                              <div className="text-lg font-extrabold text-ink">{participants}</div>
                              <div className="text-[11px] text-fade">Taking part</div>
                            </div>
                            <div>
                              <div className="text-lg font-extrabold text-ink">{completedCount}</div>
                              <div className="text-[11px] text-fade">Completed</div>
                            </div>
                            <div>
                              <div className="text-lg font-extrabold text-ink">
                                {participants > 0 ? avg.toFixed(1) : "—"}
                              </div>
                              <div className="text-[11px] text-fade">Avg progress</div>
                            </div>
                          </div>

                          {participants > 0 && (
                            <div className="mt-3">
                              <ProgressBar value={avg} max={c.targetCount} />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
