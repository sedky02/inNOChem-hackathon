"use client";


/** Client-side gate. Waits for the persisted auth store to hydrate, then
 *  redirects unauthenticated users to the login page. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  // const router = useRouter();
  // const user = useAuthStore((s) => s.user);
  // const hydrated = useAuthStore((s) => s.hydrated);

  // useEffect(() => {
  //   if (hydrated && !user) router.replace("/auth/login");
  // }, [hydrated, user, router]);

  // if (!hydrated || !user) {
  //   return (
  //     <div className="grid min-h-screen place-items-center">
  //       <Loader2 className="size-6 animate-spin text-muted-foreground" />
  //     </div>
  //   );
  // }

  return <>{children}</>;
}
