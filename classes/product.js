class Product {
	constructor(id, data, created_at = 0, updated_at = 0) {
		this.id = id;
		this.site = data.site;
		this.name = data.name;
		this.url = data.url;
		this.price = data.price;
		this.currency = data.currency;
		this.size = data.size;
		this.abv = data.abv;
		this.img = data.img;
		this.available = data.available;
		this.created_at = created_at;
		this.updated_at = updated_at;
	}
}

module.exports = Product;