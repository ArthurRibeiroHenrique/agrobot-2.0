export const API_URL = 'http://localhost:3000/v1'; 
 
export async function apiGet(path) { 
  const response = await fetch(API_URL + path); 
  return response.json(); 
} 
 
export async function apiPost(path, body) { 
  const response = await fetch(API_URL + path, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(body) 
  }); 
  return response.json(); 
} 
