interface ProductContentsProps {
  description?: string;
}

export default function ProductContents({ description }: ProductContentsProps) {
  const contents = typeof description === "string" ? description.replace(/\s+/g, " ").trim() : "";
  if (!contents) return null;

  return (
    <p
      className="fs-product-contents font-inter"
      title={contents}
      style={{
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: 3,
        overflow: "hidden",
        overflowWrap: "anywhere",
        margin: "4px 0 0",
        fontSize: 12,
        lineHeight: "18px",
        color: "#66736b",
      }}
    >
      {contents}
    </p>
  );
}
