import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ModuleLockedScreen({ title, description, baseRequired }) {
  return (
    <div className="flex justify-center items-center min-h-96 p-6">
      <div className="max-w-md text-center space-y-4">
        <Lock className="w-10 h-10 text-primary mx-auto" />
        <h1 className="text-2xl font-bold">{title} is not enabled</h1>
        <p className="text-muted-foreground">{baseRequired ? 'An active Club Nexus subscription is required before you can use this module.' : description || 'Your club does not have access to this module. Ask the system owner to enable it.'}</p>
        <Button asChild variant="outline"><Link to="/home">Back to dashboard</Link></Button>
      </div>
    </div>
  );
}