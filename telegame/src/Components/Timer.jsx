import React, { useEffect, useState } from "react";
// import styles from '../Auction/Timer.module.css';

export default function Timer() {
  // 시간을 담을 변수
  const [count, setCount] = useState(30);

  useEffect(() => {
    const id = setInterval(() => { setCount((count) => count - 1); }, 1000);
    if(count === 0) {
        clearInterval(id);
    }
    return () => clearInterval(id);
    // 카운트 변수가 바뀔때마다 useEffecct 실행
  }, [count]);

  // return <div className={styles.timer}><span className={styles.count}>{count}</span></div>;
  return <div><span>{count}</span></div>;
}
