import Link from "next/link";

export default function Footer() {
  return (
    <div id="footer">
      <footer>
        <div className="container footer-grid">
          <div>
            <img src="/images/logo.png" className="footer-logo" alt="Rise" />
            <p>
              Premium athletic apparel designed for people who never settle.
              <br />
              <br />
              Rise Above.
            </p>
            <div className="footer-social">
              <a href="#" aria-label="Instagram">
                <i className="fa-brands fa-instagram"></i>
              </a>
              <a href="#" aria-label="TikTok">
                <i className="fa-brands fa-tiktok"></i>
              </a>
              <a href="#" aria-label="Facebook">
                <i className="fa-brands fa-facebook-f"></i>
              </a>
            </div>
          </div>
          <div>
            <h4>SHOP</h4>
            <Link href="/shop">Drop 001</Link>
            <a href="#">Coming Soon</a>
          </div>
          <div>
            <h4>COMPANY</h4>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
        <div className="container">
          <div className="footer-divider"></div>
          <div className="copyright">
            <span>© 2026 RISE Apparel. All Rights Reserved.</span>
            <span className="footer-small">Built to Move. Designed to Rise.</span>
            <span className="footer-small">Contact us - inquiries@rise-wear.store</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
