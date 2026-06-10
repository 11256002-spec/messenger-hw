const PROJECT_ID = "smoexngclmhxfbdsqydu"; 
const ANON_KEY = "sb_publishable_-Mkp3x1WI2V0_nSIaO2dTQ_LJuf6Y2J"; 

export const supabaseFetch = async (rpc: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET', body?: any) => {
  const url = `https://${PROJECT_ID}.supabase.co/rest/v1/${rpc}`;

  const myHeaders = new Headers();
  myHeaders.append("apikey", ANON_KEY);
  myHeaders.append("Authorization", "Bearer " + ANON_KEY);
  myHeaders.append("Content-Type", "application/json");
  
  if (method === 'POST') {
    myHeaders.append("Prefer", "return=representation");
  }

  const config: any = { 
    method, 
    headers: myHeaders 
  };
  
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  try {
    const res = await fetch(url, config);
    if (res.status === 204) return [];
    return await res.json();
  } catch (err) {
    return null;
  }
};

export default supabaseFetch;