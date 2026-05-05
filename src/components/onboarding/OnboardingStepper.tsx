import { Check, Building2, Users, FileCode, Send, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingStepId } from "@/hooks/useOnboarding";

// ============================================================
// OnboardingStepper
//
// Top-of-page visual stepper showing where the user is in the
// 5-step Getting Started flow. Modeled on the wizard repo's
// "Step 3 of 6" badge but rendered as a proper progress bar
// with icons + labels.
//
// Used by:
//   * /dashboard/getting-started (with onClick to navigate)
//   * /dashboard/campaigns/new when ?onboarding=1 (read-only)
// ============================================================

interface Step {
  id:    OnboardingStepId;
  label: string;
  icon:  React.ElementType;
}

export const STEPS: Step[] = [
  { id: "company",   label: "Company",   icon: Building2 },
  { id: "employees", label: "Employees", icon: Users     },
  { id: "templates", label: "Templates", icon: FileCode  },
  { id: "campaign",  label: "Campaign",  icon: Send      },
  { id: "results",   label: "Results",   icon: Activity  },
];

export function stepIndex(id: OnboardingStepId): number {
  return STEPS.findIndex((s) => s.id === id);
}

interface Props {
  /** Which step is currently in progress (highlighted) */
  currentStep:    OnboardingStepId;
  /** Which steps are done — completion marks shown as filled circles */
  completedSteps: OnboardingStepId[];
  /** Optional click handler — pass to allow navigation to completed steps */
  onStepClick?:   (id: OnboardingStepId) => void;
}

export function OnboardingStepper({
  currentStep, completedSteps, onStepClick,
}: Props) {
  const currentIdx = stepIndex(currentStep);

  return (
    <nav aria-label="Onboarding progress" className="w-full">
      <ol className="flex items-start gap-1 sm:gap-2">
        {STEPS.map((step, idx) => {
          const Icon       = step.icon;
          const isComplete = completedSteps.includes(step.id);
          const isCurrent  = step.id === currentStep;
          const isFuture   = idx > currentIdx && !isComplete;
          const isClickable = !!onStepClick && (isComplete || isCurrent);

          return (
            <li key={step.id} className="flex-1 flex items-start">
              {/* Step button + label */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                className={cn(
                  "flex flex-col items-center gap-1.5 flex-1 min-w-0 group transition",
                  isClickable && "cursor-pointer hover:opacity-80",
                  !isClickable && "cursor-default",
                )}
              >
                {/* Icon circle */}
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors shrink-0",
                    isComplete && "border-emerald-500 bg-emerald-500 text-white",
                    isCurrent  && !isComplete && "border-primary bg-primary text-primary-foreground ring-4 ring-primary/15",
                    isFuture   && "border-muted-foreground/30 bg-background text-muted-foreground/60",
                  )}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "text-xs font-medium leading-tight text-center",
                    isComplete && "text-emerald-700",
                    isCurrent  && !isComplete && "text-foreground",
                    isFuture   && "text-muted-foreground/60",
                  )}
                >
                  {step.label}
                </span>

                {/* Step number — small under label */}
                <span className="text-[10px] text-muted-foreground/70 tabular-nums">
                  Step {idx + 1}
                </span>
              </button>

              {/* Connector line — drawn between steps, not after last */}
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mt-[18px] mx-1 transition-colors",
                    isComplete ? "bg-emerald-500" : "bg-muted-foreground/20",
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
