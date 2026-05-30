import { permanentRedirect } from "next/navigation";

export default function SecurityRedirect() {
  permanentRedirect("/docs/security");
}
