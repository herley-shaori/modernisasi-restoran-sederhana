import streamlit as st

# Initialize session state for cart
if 'cart' not in st.session_state:
    st.session_state.cart = {}

# Menu data
menu = {
    "Ayam Goreng": 15000,
    "Tahu Goreng": 5000,
    "Pisang Goreng": 7000,
    "Es Teh": 5000,
    "Nasi Putih": 6000,
    "Tempe Goreng": 5000,
    "Sambal": 3000
}

# Page configuration
st.set_page_config(page_title="Warung Makan Sedap", layout="centered")
st.title("Warung Makan Sedap")
st.markdown("Selamat datang di Warung Makan Sedap! Nikmati hidangan lezat dengan harga terjangkau.")

# Display menu
st.header("Menu")
for item, price in menu.items():
    col1, col2, col3 = st.columns([3, 1, 2])
    with col1:
        st.write(f"**{item}**")
    with col2:
        st.write(f"Rp {price:,}")
    with col3:
        # Slider for quantity
        quantity = st.slider(f"Jumlah {item}", min_value=0, max_value=10, value=st.session_state.cart.get(item, 0), key=f"slider_{item}")
        if quantity > 0:
            st.session_state.cart[item] = quantity
        elif item in st.session_state.cart and quantity == 0:
            del st.session_state.cart[item]

# Display cart
st.header("Keranjang Pesanan")
if st.session_state.cart:
    total_price = 0
    for item, quantity in st.session_state.cart.items():
        price = menu[item] * quantity
        total_price += price
        st.write(f"{item} x{quantity}: Rp {price:,}")
    st.subheader(f"**Total Harga: Rp {total_price:,}**")
else:
    st.write("Keranjang kosong. Silakan tambahkan menu!")

# Order button
if st.session_state.cart:
    if st.button("Pesan", key="order_button", type="primary"):
        st.success("Pesanan Anda telah diterima! Terima kasih telah memesan di Warung Makan Sedap.")
        st.session_state.cart = {}  # Reset cart after ordering

# Footer
st.markdown("---")
st.markdown("**Warung Makan Sedap** - Hidangan Rumahan dengan Cita Rasa Nusantara")