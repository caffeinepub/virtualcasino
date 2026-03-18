import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, PackageOpen, ShoppingBag, Star } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  useGetAllProducts,
  useGetMyRedemptions,
  useGetPointsBalance,
  useRedeemProduct,
} from "../hooks/useQueries";

const cardStyle = {
  background: "oklch(0.11 0.015 280)",
  border: "1px solid oklch(0.22 0.03 275)",
};

const CATEGORY_COLORS: Record<string, string> = {
  car: "oklch(0.65 0.28 340)",
  account: "oklch(0.70 0.20 190)",
  bundle: "oklch(0.78 0.18 72)",
  other: "oklch(0.55 0.25 290)",
};

function getCategoryColor(cat: string) {
  const key = cat.toLowerCase();
  for (const k of Object.keys(CATEGORY_COLORS)) {
    if (key.includes(k)) return CATEGORY_COLORS[k];
  }
  return CATEGORY_COLORS.other;
}

function formatDate(ts: bigint) {
  try {
    const ms = Number(ts / BigInt(1_000_000));
    return new Date(ms).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function PointsShopPage() {
  const { data: pointsBalance, isLoading: balanceLoading } =
    useGetPointsBalance();
  const { data: products, isLoading: productsLoading } = useGetAllProducts();
  const { data: myRedemptions, isLoading: redemptionsLoading } =
    useGetMyRedemptions();
  const {
    mutateAsync: redeem,
    isPending: redeeming,
    variables: redeemingId,
  } = useRedeemProduct();

  const points = pointsBalance ?? BigInt(0);

  const handleRedeem = async (productId: string, productName: string) => {
    try {
      await redeem(productId);
      toast.success(
        `🎉 Redeemed "${productName}"! Staff will contact you shortly.`,
      );
    } catch (err: any) {
      toast.error(
        err?.message ?? "Redemption failed. Check your points balance.",
      );
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 mb-6 p-5 rounded-xl"
          style={{
            background: "oklch(0.11 0.015 280)",
            border: "1px solid oklch(0.55 0.25 290 / 0.5)",
            boxShadow: "0 0 24px oklch(0.55 0.25 290 / 0.12)",
          }}
          data-ocid="shop.section"
        >
          <ShoppingBag
            className="w-7 h-7"
            style={{
              color: "oklch(0.55 0.25 290)",
              filter: "drop-shadow(0 0 6px oklch(0.55 0.25 290 / 0.7))",
            }}
          />
          <div className="flex-1">
            <h1
              className="font-display font-black text-2xl tracking-widest"
              style={{
                color: "oklch(0.55 0.25 290)",
                textShadow: "0 0 10px oklch(0.55 0.25 290 / 0.5)",
              }}
            >
              POINTS SHOP
            </h1>
            <p className="text-xs text-muted-foreground">
              Win games to earn points. Redeem for real rewards!
            </p>
          </div>

          {/* Points Balance */}
          <motion.div
            className="flex items-center gap-2 px-5 py-3 rounded-xl"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.14 0.025 280), oklch(0.16 0.04 290))",
              border: "2px solid oklch(0.55 0.25 290 / 0.6)",
              boxShadow: "0 0 20px oklch(0.55 0.25 290 / 0.2)",
            }}
            animate={{
              boxShadow: [
                "0 0 20px oklch(0.55 0.25 290 / 0.2)",
                "0 0 35px oklch(0.55 0.25 290 / 0.4)",
                "0 0 20px oklch(0.55 0.25 290 / 0.2)",
              ],
            }}
            transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY }}
            data-ocid="shop.points.card"
          >
            <Star
              className="w-5 h-5"
              style={{ color: "oklch(0.55 0.25 290)" }}
            />
            {balanceLoading ? (
              <Loader2
                className="w-5 h-5 animate-spin"
                style={{ color: "oklch(0.55 0.25 290)" }}
              />
            ) : (
              <span
                className="text-2xl font-black font-display"
                style={{
                  color: "oklch(0.55 0.25 290)",
                  textShadow: "0 0 10px oklch(0.55 0.25 290 / 0.6)",
                }}
              >
                {points.toString()}
              </span>
            )}
            <span className="text-xs text-muted-foreground font-bold tracking-wider">
              POINTS
            </span>
          </motion.div>
        </div>

        {/* Products Grid */}
        <h2
          className="font-display font-black text-lg tracking-widest mb-4"
          style={{ color: "oklch(0.90 0.05 290)" }}
        >
          🛍️ AVAILABLE REWARDS
        </h2>

        {productsLoading ? (
          <div
            className="flex items-center justify-center py-16"
            data-ocid="shop.products.loading_state"
          >
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: "oklch(0.55 0.25 290)" }}
            />
          </div>
        ) : !products || products.length === 0 ? (
          <div
            className="py-16 text-center rounded-xl"
            style={{
              background: "oklch(0.11 0.015 280)",
              border: "1px solid oklch(0.22 0.03 275)",
            }}
            data-ocid="shop.products.empty_state"
          >
            <PackageOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground font-bold">
              No products available yet.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Check back soon — staff are adding rewards!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {products.map((product, i) => {
              const catColor = getCategoryColor(product.category);
              const canAfford = points >= product.pointPrice;
              const isRedeeming = redeeming && redeemingId === product.id;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl overflow-hidden flex flex-col"
                  style={{
                    ...cardStyle,
                    border: `1px solid ${catColor}40`,
                    boxShadow: `0 0 16px ${catColor}18`,
                  }}
                  data-ocid={`shop.products.item.${i + 1}`}
                >
                  {/* Color bar */}
                  <div
                    className="h-1.5"
                    style={{
                      background: `linear-gradient(90deg, ${catColor}, transparent)`,
                    }}
                  />

                  <div className="p-5 flex-1 flex flex-col gap-3">
                    {/* Category Badge */}
                    <Badge
                      className="self-start text-xs font-black tracking-wider border-none"
                      style={{
                        background: `${catColor}22`,
                        color: catColor,
                        border: `1px solid ${catColor}55`,
                      }}
                    >
                      {product.category.toUpperCase()}
                    </Badge>

                    <div className="flex-1">
                      <h3
                        className="font-display font-black text-base tracking-wide mb-1"
                        style={{ color: "oklch(0.92 0.04 290)" }}
                      >
                        {product.name}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {product.description}
                      </p>
                    </div>

                    {/* Price + Redeem */}
                    <div
                      className="flex items-center justify-between gap-3 pt-2"
                      style={{ borderTop: "1px solid oklch(0.20 0.025 278)" }}
                    >
                      <div className="flex items-center gap-1.5">
                        <Star
                          className="w-4 h-4"
                          style={{ color: "oklch(0.55 0.25 290)" }}
                        />
                        <span
                          className="text-xl font-black font-display"
                          style={{ color: "oklch(0.55 0.25 290)" }}
                        >
                          {product.pointPrice.toString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          pts
                        </span>
                      </div>

                      <Button
                        size="sm"
                        disabled={!canAfford || isRedeeming}
                        onClick={() => handleRedeem(product.id, product.name)}
                        className="font-black text-xs tracking-wider border-none"
                        style={
                          canAfford
                            ? {
                                background:
                                  "linear-gradient(135deg, oklch(0.55 0.25 290), oklch(0.45 0.22 270))",
                                boxShadow:
                                  "0 0 12px oklch(0.55 0.25 290 / 0.4)",
                                color: "#fff",
                              }
                            : {
                                background: "oklch(0.18 0.02 278)",
                                color: "oklch(0.45 0.04 280)",
                                cursor: "not-allowed",
                              }
                        }
                        data-ocid={`shop.redeem_button.${i + 1}`}
                      >
                        {isRedeeming ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : null}
                        {canAfford ? "Redeem" : "Not enough points"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* My Redemptions */}
        <h2
          className="font-display font-black text-lg tracking-widest mb-4"
          style={{ color: "oklch(0.90 0.05 290)" }}
        >
          📋 MY REDEMPTIONS
        </h2>

        {redemptionsLoading ? (
          <div
            className="flex items-center justify-center py-10"
            data-ocid="shop.redemptions.loading_state"
          >
            <Loader2
              className="w-6 h-6 animate-spin"
              style={{ color: "oklch(0.55 0.25 290)" }}
            />
          </div>
        ) : !myRedemptions || myRedemptions.length === 0 ? (
          <div
            className="py-12 text-center rounded-xl"
            style={{
              background: "oklch(0.11 0.015 280)",
              border: "1px solid oklch(0.22 0.03 275)",
            }}
            data-ocid="shop.redemptions.empty_state"
          >
            <Star className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground font-bold">
              No redemptions yet.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Redeem a product above to see your history here.
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "oklch(0.11 0.015 280)",
              border: "1px solid oklch(0.55 0.25 290 / 0.3)",
            }}
            data-ocid="shop.redemptions.table"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{ borderBottom: "1px solid oklch(0.20 0.025 278)" }}
                  >
                    <th
                      className="px-5 py-3 text-left font-black tracking-wider text-xs"
                      style={{ color: "oklch(0.55 0.25 290)" }}
                    >
                      PRODUCT
                    </th>
                    <th
                      className="px-5 py-3 text-left font-black tracking-wider text-xs"
                      style={{ color: "oklch(0.55 0.25 290)" }}
                    >
                      POINTS PAID
                    </th>
                    <th
                      className="px-5 py-3 text-left font-black tracking-wider text-xs"
                      style={{ color: "oklch(0.55 0.25 290)" }}
                    >
                      DATE
                    </th>
                    <th
                      className="px-5 py-3 text-left font-black tracking-wider text-xs"
                      style={{ color: "oklch(0.55 0.25 290)" }}
                    >
                      STATUS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...(myRedemptions as any[])]
                    .sort((a, b) => Number(b.timestamp - a.timestamp))
                    .map((r, i) => (
                      <tr
                        key={r.id}
                        style={{
                          borderBottom: "1px solid oklch(0.17 0.02 278)",
                        }}
                        data-ocid={`shop.redemptions.item.${i + 1}`}
                      >
                        <td
                          className="px-5 py-3 font-bold"
                          style={{ color: "oklch(0.90 0.04 290)" }}
                        >
                          {r.productName}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <Star
                              className="w-3 h-3"
                              style={{ color: "oklch(0.55 0.25 290)" }}
                            />
                            <span style={{ color: "oklch(0.55 0.25 290)" }}>
                              {r.pointPrice.toString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground text-xs">
                          {formatDate(r.timestamp)}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className="px-2.5 py-1 rounded-full text-xs font-black tracking-wider"
                            style={
                              r.status === "Sent"
                                ? {
                                    background: "oklch(0.50 0.18 145 / 0.2)",
                                    border:
                                      "1px solid oklch(0.50 0.18 145 / 0.5)",
                                    color: "oklch(0.65 0.18 145)",
                                    boxShadow:
                                      "0 0 6px oklch(0.50 0.18 145 / 0.3)",
                                  }
                                : {
                                    background: "oklch(0.65 0.18 72 / 0.2)",
                                    border:
                                      "1px solid oklch(0.65 0.18 72 / 0.5)",
                                    color: "oklch(0.78 0.18 72)",
                                    boxShadow:
                                      "0 0 6px oklch(0.65 0.18 72 / 0.3)",
                                  }
                            }
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
