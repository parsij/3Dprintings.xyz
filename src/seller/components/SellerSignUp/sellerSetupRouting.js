export const SELLER_SETUP_ROUTE_BY_STEP = {
  stripe_connect: "/onboarding/stripe",
  shipping_origin: "/onboarding/shipping",
  first_box: "/boxes?new=1",
  completed: "/inventory",
};

export function resolveSellerSetupRoute(completionStep) {
  return SELLER_SETUP_ROUTE_BY_STEP[completionStep] || "/onboarding/stripe";
}
