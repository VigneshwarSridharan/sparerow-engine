type PostOffice = {
  District: string;
  State: string;
};

type PincodeApiResponse = {
  Status: string;
  PostOffice: PostOffice[] | null;
}[];

export async function lookupIndianPincode(pincode: string): Promise<{ city: string; state: string } | null> {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    if (!res.ok) return null;
    const data = (await res.json()) as PincodeApiResponse;
    const postOffice = data[0]?.Status === 'Success' ? data[0].PostOffice?.[0] : null;
    if (!postOffice) return null;
    return { city: postOffice.District, state: postOffice.State };
  } catch {
    return null;
  }
}
