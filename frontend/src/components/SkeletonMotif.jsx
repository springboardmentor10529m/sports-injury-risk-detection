export default function SkeletonMotif({ className = "", opacity = 1 }) {
  // Simplified stick-figure keypoint graph, styled like a motion-capture
  // marker rig. Used as the brand's signature element - not decorative
  // gradient noise, but a literal (simplified) rendering of what the
  // pose-estimation engine tracks.
  const joints = [
    [50, 10], // head
    [50, 22], // neck
    [30, 30], [70, 30], // shoulders
    [22, 50], [78, 50], // elbows
    [16, 68], [84, 68], // wrists
    [50, 45], // chest/spine mid
    [38, 55], [62, 55], // hips
    [36, 80], [64, 80], // knees
    [34, 102], [66, 102], // ankles
  ];
  const bones = [
    [0, 1], [1, 2], [1, 3], [2, 4], [4, 6], [3, 5], [5, 7],
    [1, 8], [8, 9], [8, 10], [9, 11], [10, 12], [11, 13], [12, 14],
  ];
  return (
    <svg
      viewBox="0 0 100 112"
      className={className}
      style={{ opacity }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {bones.map(([a, b], i) => (
        <line
          key={i}
          x1={joints[a][0]} y1={joints[a][1]}
          x2={joints[b][0]} y2={joints[b][1]}
          stroke="var(--accent)" strokeWidth="0.6" strokeDasharray="2 2"
        />
      ))}
      {joints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 0 ? 4 : 1.8} fill="var(--accent)" />
      ))}
    </svg>
  );
}
