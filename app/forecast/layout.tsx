import ForecastSubscriptionManager from "./components/ForecastSubscriptionManager";

export default function ForecastLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ForecastSubscriptionManager>{children}</ForecastSubscriptionManager>;
}
