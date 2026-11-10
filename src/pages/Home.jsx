import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useNavigate } from '@/lib/router-compat';
import Showcase from "./Showcase";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.isAuthenticated()
      .then((isAuth) => {
        if (isAuth) {
          navigate(createPageUrl("UserProfileView"));
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return <Showcase />;
}