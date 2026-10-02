import Link from "next/link";
import { BackIcon } from "./icons";
import BottomNav from "./BottomNav";
import styles from "./ComingSoon.module.css";

// Placeholder for screens that are designed but not built yet.
export default function ComingSoon({ title, path }: { title: string; path: string }) {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <Link href="/" aria-label="กลับหน้าแรก" className={styles.back}>
          <BackIcon />
        </Link>
        <h1 className={styles.title}>{title}</h1>
      </header>
      <main className={styles.body}>
        <p className={styles.lead}>หน้านี้กำลังพัฒนา</p>
        <p className={styles.muted}>
          ถ้าเป็นเหตุฉุกเฉิน โทร <a href="tel:1784">1784</a> (ปภ.) หรือ <a href="tel:1669">1669</a>
        </p>
      </main>
      <BottomNav current={path} />
    </div>
  );
}
