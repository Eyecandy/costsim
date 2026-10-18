import { cn } from "@/shared/utils"

export function SideLabel({ children, accent }: { children: string; accent?: boolean }) {
  return (
    <p
      className={cn(
        "m-0 font-sans text-[11px] font-medium uppercase tracking-wide",
        accent ? "text-[#1d868c]" : "text-muted-foreground",
      )}
    >
      {children}
    </p>
  )
}

export function SecondaryEffect({
  text,
  title,
  testAttr,
}: {
  text: string
  title?: string
  testAttr: string
}) {
  return (
    <p
      className="m-0 flex h-5 items-center justify-center font-sans text-[12px] tabular-nums text-muted-foreground"
      title={title}
      {...{ [testAttr]: "" }}
    >
      {text}
    </p>
  )
}

export function SecondarySpacer() {
  return <div className="h-5" aria-hidden />
}
