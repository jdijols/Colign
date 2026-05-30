import { Card } from "flowbite-react";

export function ReconcilePage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Card>
        <h1 className="text-2xl font-bold">Reconciliation</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Sunday slot — planned vs. actual diff lands here.
        </p>
      </Card>
    </div>
  );
}
