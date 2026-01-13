export default function GitHubCorner({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="github-ribbon"
      aria-label="Fork me on GitHub"
    >
      Fork me on GitHub
    </a>
  );
}
