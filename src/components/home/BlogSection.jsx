import { Link } from 'react-router-dom'
import Reveal from '../common/Reveal'
import { bg } from '../../utils/helpers'

const POSTS = [
  {
    id: 1,
    image: 'blog_img_01.jpg',
    tag: 'Charity',
    author: 'M Riad',
    date: '25 Nov 2025',
    title: 'Behind the Scenes: How Your Donations Are Used',
    comments: '08 Comment',
    delay: 0,
  },
  {
    id: 2,
    image: 'blog_img_02.jpg',
    tag: 'Charity',
    author: 'M Riad',
    date: '25 Nov 2025',
    title: 'Behind the Scenes: Where Your Donations Go',
    comments: '08 Comment',
    delay: 100,
  },
  {
    id: 3,
    image: 'blog_img_03.jpg',
    tag: 'Charity',
    author: 'M Riad',
    date: '25 Nov 2025',
    title: 'Behind the Scenes: How Your Gifts Are Used',
    comments: '08 Comment',
    delay: 200,
  },
  {
    id: 4,
    image: 'blog_img_04.jpg',
    tag: 'Charity',
    author: 'M Riad',
    date: '25 Nov 2025',
    title: 'Behind the Scenes: How Your Support Is Used',
    comments: '08 Comment',
    delay: 300,
  },
]

export default function BlogSection() {
  return (
    <div id="blog" className="blog-section-one pt-130 lg-pt-80 pb-170 lg-pb-80">
      <div className="container">
        <Reveal className="title-one text-center mb-30 lg-mb-10" anim="slide-up" duration={900}>
          <div className="upper-title">News Update</div>
          <h2>Latest News &amp; Articles</h2>
        </Reveal>
        {/* /.title-one */}
      </div>

      <div className="box-layout-two">
        <div className="row">
          {POSTS.map((post) => (
            <Reveal
              key={post.id}
              className="col-xl-3 col-md-6"
              anim="slide-up"
              duration={900}
              delay={post.delay}
            >
              <article className="blog-meta-one mt-30">
                <div className="post-info">
                  <ul className="style-none post-author d-flex justify-content-center flex-wrap">
                    <li>
                      <span>{post.tag}</span>
                    </li>
                    <li>
                      <i className="fa-regular fa-user"></i>{' '}
                      <Link to="/#blog">{post.author}</Link>
                    </li>
                    <li>
                      <i className="fa-regular fa-calendar"></i>{' '}
                      <Link to="/#blog">{post.date}</Link>
                    </li>
                  </ul>
                </div>
                <div className="img-meta" style={bg(post.image)}></div>
                <div className="post-meta">
                  <h4 className="blog-title">
                    <Link to="/#blog" className="line-bg">
                      {post.title}
                    </Link>
                  </h4>
                  <ul className="style-none bottom-widget d-flex flex-wrap">
                    <li>
                      <Link to="/#blog" className="details-cta tran3s">
                        Details More
                      </Link>
                    </li>
                    <li>
                      <i className="fa-regular fa-comment"></i>{' '}
                      <Link to="/#blog" className="comment">
                        {post.comments}
                      </Link>
                    </li>
                  </ul>
                </div>
                {/* /.post-meta */}
              </article>
              {/* /.blog-meta-one */}
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  )
}
