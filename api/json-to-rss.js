import axios from "axios";
import { toXML } from "jstoxml";

export default async function jsonToRss(req, res) {
  const xml = await xcodereleases();

  res.setHeader("Content-Type", "text/xml");
  res.write(xml);
  res.end();
};

async function xcodereleases() {
  const tagMap = new Map();
  tagMap.set("gm", "GM");
  tagMap.set("gmSeed", "GM Seed");
  tagMap.set("beta", "Beta");

  const releases = await fetchReleases();
  const items = releases.map((release) => {
    const tag = Object.entries(release.version.release)
      .map(([key, value]) => {
        const tag = tagMap.get(key) || key;
        const ver = value !== true ? value : "";
        return `${tag} ${ver}`.trim();
      })
      .join(" ");
    return {
      item: {
        title: `${release.name} ${release.version.number} ${tag} (${release.version.build})`,
        link: release.links.download.url,
        guid: release.links.download.url,
        description() {
          const getSDKInfo = (sdks) => {
            return (key) => {
              if (!sdks[key]) {
                return `${key}: n/a`;
              }
              const { number, build } = sdks[key][0];
              return `${key}: ${number} (${build})`;
            };
          };
          const info = getSDKInfo(release.sdks);
          const output = [
            `Requires: ${release.requires}`,
            info("iOS"),
            info("macOS"),
            info("tvOS"),
            info("watchOS"),
          ].join(" -- ");
          return `<![CDATA[\n${output}\n]]>`;
        },
        pubDate: new Date(
          release.date.year,
          release.date.month - 1,
          release.date.day
        ).toUTCString(),
      },
    };
  });

  return toXML(
    {
      _name: "rss",
      _attrs: {
        version: "2.0",
      },
      _content: {
        channel: [
          {
            title: "xcodereleases",
            description: "RSS feed for https://xcodereleases.com/data.json",
            language: "en",
            link: "https://xcodereleases.com",
            lastBuildDate() {
              return new Date().toUTCString();
            },
            pubDate() {
              return new Date().toUTCString();
            },
          },
          ...items,
        ],
      },
    },
    {
      header: true,
      indent: "  ",
    }
  );
}

async function fetchReleases(limit = 10) {
  return axios
    .get("https://xcodereleases.com/data.json")
    .then((res) => res.data.slice(0, limit));
}
