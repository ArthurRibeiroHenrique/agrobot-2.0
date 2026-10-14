export function track(event: string, properties?: Record<string, unknown>) {
  console.log(event, properties);
}
