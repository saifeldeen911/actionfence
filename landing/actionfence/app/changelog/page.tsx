import { permanentRedirect } from "next/navigation";

export default function ChangelogRedirect() {
  permanentRedirect("/docs/changelog");
}
