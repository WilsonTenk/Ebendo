import { StatusPanel } from "@/components/StatusPanel";

export default function NotFound() {
  return (
    <StatusPanel
      icon="search"
      eyebrow="404"
      title="We couldn't find that page"
      body="The item may have sold out or the link may be wrong. Have a look around the shop instead."
      actions={[
        { label: "Back to the shop", href: "/shop", primary: true },
        { label: "Track my plan", href: "/plan" },
      ]}
    />
  );
}
