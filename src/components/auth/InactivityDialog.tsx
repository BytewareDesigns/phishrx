import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface InactivityDialogProps {
  open: boolean;
  secondsLeft: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export function InactivityDialog({
  open,
  secondsLeft,
  onStayLoggedIn,
  onLogout,
}: InactivityDialogProps) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeDisplay = minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, "0")}`
    : `${seconds}s`;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        // Prevent closing by clicking overlay
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <DialogTitle className="text-lg">Session Expiring Soon</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            You have been inactive for a while. For your security, you will be
            automatically signed out in{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {timeDisplay}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-row gap-3 sm:justify-end mt-2">
          <Button variant="outline" onClick={onLogout}>
            Sign Out Now
          </Button>
          <Button onClick={onStayLoggedIn}>Stay Signed In</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
