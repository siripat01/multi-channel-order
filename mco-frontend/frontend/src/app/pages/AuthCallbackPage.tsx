import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";
import { API_BASE_URL } from "../../config";

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // Get params from hash (#access_token=...) or search (?code=...)
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);

      const searchParams = new URLSearchParams(window.location.search);

      // Case 1: Tokens in hash (Supabase/OAuth2 Implicit Flow)
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken) {
        try {
          const response = await fetch(`${API_BASE_URL}/callback?code=${accessToken}`);
          // Decode JWT to get user info
          const payloadBase64 = accessToken.split('.')[1];
          const decodedPayload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));

          const sessionData = {
            session: {
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_in: parseInt(hashParams.get("expires_in") || "3600"),
              token_type: hashParams.get("token_type") || "bearer"
            },
            user: decodedPayload.user_metadata || decodedPayload
          };

          localStorage.setItem("auth_session", JSON.stringify(sessionData));
          localStorage.setItem("auth_user", JSON.stringify(sessionData.user));
          navigate("/");
          return;
        } catch (err) {
          console.error("Error decoding token:", err);
          setError("Failed to process authentication token.");
          return;
        }
      }

      // Case 2: Error in hash or query
      const errorDescription = hashParams.get("error_description") || searchParams.get("error_description");
      const errorType = hashParams.get("error") || searchParams.get("error");

      if (errorType || errorDescription) {
        setError(errorDescription || errorType || "Authentication failed.");
        return;
      }

      // Case 3: OAuth code in search params (Auth Code Flow)
      // const code = searchParams.get("code");
      // if (code) {
      //   exchangeCodeForSession(code);
      // } else {
      //   // If we get here and there's no hash/code, something is wrong
      //   // But let's wait a bit in case it's still loading
      //   const timer = setTimeout(() => {
      //     if (!window.location.hash && !window.location.search) {
      //        setError("No authentication response found.");
      //     }
      //   }, 2000);
      //   return () => clearTimeout(timer);
      // }
    };

    handleCallback();
  }, [navigate]);

  // const exchangeAccessTokenForSession = async (accessToken: string) => {
  //   try {
  //     const response = await fetch(`${API_BASE_URL}/callback?code=${accessToken}`);
  //     const result = await response.json();

  //     if (result.error) {
  //       throw new Error(result.error);
  //     }

  //     // Save user profile and session if provided
  //     if (result.data) {
  //       // Assuming session/user info needs to be stored
  //       localStorage.setItem("auth_session", JSON.stringify(result.data));
  //       navigate("/");
  //     } else {
  //       throw new Error("Failed to retrieve session data");
  //     }
  //   } catch (err: any) {
  //     console.error("Callback error:", err);
  //     setError(err.message || "Something went wrong during authentication");
  //   }
  // };

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-destructive">Authentication Error</h2>
          <p className="mb-4 text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
        <h2 className="text-2xl font-bold">Finishing up...</h2>
        <p className="text-muted-foreground">Setting up your session, please wait.</p>
      </div>
    </div>
  );
}
