import Link from "next/link";
import { ListIcon, MapIcon, RainIcon, UserIcon } from "./icons";
import styles from "./BottomNav.module.css";

const ITEMS = [
  { href: "/", label: "แผนที่", Icon: MapIcon },
  { href: "/simulate", label: "จำลอง", Icon: RainIcon },
  { href: "/requests", label: "คำขอของฉัน", Icon: ListIcon },
  { href: "/me", label: "ฉัน", Icon: UserIcon },
] as const;

export default function BottomNav({ current }: { current: string }) {
  return (
    <nav aria-label="เมนูหลัก" className={styles.nav}>
      {ITEMS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={styles.item} aria-current={current === href ? "page" : undefined}>
          <Icon />
          {label}
        </Link>
      ))}
    </nav>
  );
}
