"use client";

import { useEffect, useState } from "react";
import { Notice, Page, adminApi, fromCents, toCents, useAdminData, useNotice } from "../util";

export default function ShippingPage() {
  const { data, reload } = useAdminData<{ governorate: string; costCents: number }[]>("/admin/shipping-rates");
  const { msg, run } = useNotice();
  const [rates, setRates] = useState<Record<string, string>>({});
  const [bulk, setBulk] = useState("");

  useEffect(() => {
    if (data) setRates(Object.fromEntries(data.map((r) => [r.governorate, fromCents(r.costCents)])));
  }, [data]);

  const save = () =>
    run(async () => {
      await adminApi.put("/admin/shipping-rates", Object.entries(rates).map(([governorate, v]) => ({ governorate, costCents: toCents(v || 0) })));
      await reload();
    }, "Shipping rates saved.");

  return (
    <Page title="Shipping rates" sub="What a customer pays for delivery, by governorate (EGP).">
      <Notice msg={msg} />
      <div className="card">
        <div className="flex" style={{ marginBottom: 16 }}>
          <input className="plain" style={{ maxWidth: 140 }} type="number" min={0} placeholder="Set all to…" value={bulk} onChange={(e) => setBulk(e.target.value)} />
          <button className="btn-a ghost sm" onClick={() => bulk !== "" && setRates(Object.fromEntries(Object.keys(rates).map((g) => [g, bulk])))}>Apply to all</button>
        </div>
        <div className="row c4">
          {Object.keys(rates).sort().map((g) => (
            <div className="f" key={g}>
              <label>{g}</label>
              <input type="number" min={0} step="1" value={rates[g]} onChange={(e) => setRates({ ...rates, [g]: e.target.value })} />
            </div>
          ))}
        </div>
        <button className="btn-a" onClick={save}>Save rates</button>
      </div>
    </Page>
  );
}
