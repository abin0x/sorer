import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function HelpSearchBox({ initial = '', large = false }) {
  const [q, setQ] = useState(initial);
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/help/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <form onSubmit={submit} className="flex gap-2 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search for help, e.g. reset password"
          aria-label="Search help articles"
          className={`pl-10 bg-background ${large ? 'h-14 text-base' : 'h-11'}`}
        />
      </div>
      <Button type="submit" className={large ? 'h-14 px-6' : 'h-11'}>Search</Button>
    </form>
  );
}