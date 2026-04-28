import { ShieldAlert, BookOpen, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const TIPS = [
  "Check the sender's email address — hover over names to see the real address.",
  'Be wary of urgent language like "Act now" or "Your account will be suspended."',
  "Verify unexpected links by going directly to the website, not clicking the link.",
  "When in doubt, call the sender directly using a known phone number.",
  "Report suspicious emails to your IT or security team immediately.",
];

export default function Fail() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <ShieldAlert className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold">
          Phish<span className="text-primary">Rx</span>
        </span>
      </div>

      {/* Main card */}
      <div className="w-full max-w-lg text-center space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 mx-auto">
            <ShieldAlert className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            You've been phished!
          </h1>
          <p className="text-muted-foreground text-base">
            Don't worry — this was a <strong>simulated</strong> phishing test
            run by your organization's security team. No real harm was done, but
            this is a great opportunity to sharpen your awareness.
          </p>
        </div>

        {/* What happened */}
        <Card className="text-left">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">What just happened?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You clicked a link in a simulated phishing email. In a real
                  attack this could have exposed your login credentials, installed
                  malware, or compromised patient data.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="text-left">
          <CardContent className="pt-5">
            <p className="font-semibold text-sm mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              How to spot phishing next time
            </p>
            <ul className="space-y-2">
              {TIPS.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => window.close()}
          >
            Close this window
          </Button>
          <Button
            onClick={() =>
              window.open("https://training.medcurity.com", "_blank", "noopener")
            }
          >
            Go to Security Training
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          This simulation is authorized by your organization's security team
          and administered by PhishRx. Your response has been recorded for
          training purposes only.
        </p>
      </div>
    </div>
  );
}
