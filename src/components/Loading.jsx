// Full-screen branded loading state, shown while auth/session resolves.
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sand">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-forest/20 border-t-forest"
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}
