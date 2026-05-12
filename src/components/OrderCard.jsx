import React from 'react'

const OrderCard = ({orderNumber, status, total, date, paymentMethod}) => {
    return (
        <div className={"flex flex-row"}>
            <h2 className={"text-2xl"}>
                # Order Details {orderNumber}
            </h2>
        </div>
    )
}
export default OrderCard
