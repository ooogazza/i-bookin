import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp } from "lucide-react";

const ProgressTrackerPlaceholder = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="max-w-2xl w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-primary/10">
            <TrendingUp className="h-16 w-16 text-primary" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold">Progress Tracker</h1>
        
        <div className="space-y-4 text-muted-foreground">
          <p className="text-lg">
            The Progress Tracker module is ready to be integrated.
          </p>
          <p>
            To complete the integration, copy your Progress Tracker code files into this project:
          </p>
          <ul className="text-left max-w-md mx-auto space-y-2 list-disc list-inside">
            <li>Copy page components to <code className="bg-secondary px-2 py-1 rounded">src/pages/tracker/</code></li>
            <li>Copy any components to <code className="bg-secondary px-2 py-1 rounded">src/components/tracker/</code></li>
            <li>Update the routes in <code className="bg-secondary px-2 py-1 rounded">src/App.tsx</code></li>
          </ul>
        </div>

        <Button onClick={() => navigate('/')} size="lg" className="mt-8">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default ProgressTrackerPlaceholder;
