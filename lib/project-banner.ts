export type ProjectBanner = {
  id: string;
  name: string;
  twitterUrl: string;
  websiteUrl: string;
  description: string;
  imageUrl: string;
  active: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ProjectBannerRow = {
  id: string;
  name: string;
  twitter_url: string;
  website_url: string;
  description: string;
  image_url: string;
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export function projectBanner(row: ProjectBannerRow): ProjectBanner {
  return {
    id: row.id,
    name: row.name,
    twitterUrl: row.twitter_url,
    websiteUrl: row.website_url,
    description: row.description,
    imageUrl: row.image_url,
    active: row.active,
    displayOrder: Number(row.display_order),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
