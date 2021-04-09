import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { format } from 'date-fns';

import Prismic from '@prismicio/client';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

import { FiCalendar, FiUser } from 'react-icons/fi';
import ptBR from 'date-fns/locale/pt-BR';
import Header from '../components/Header';
import { useState } from 'react';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }:  HomeProps) {
  const formattedPost = postsPagination.results.map(post => {
    return {
      ...post,
      first_publication_date: format(new Date(post.first_publication_date), 'dd MMM yyyy', 
        {
          locale: ptBR,
        }
      ),
    };
  });

  const [posts, setPosts] = useState(formattedPost)
  const [nextPage, setNextPage] = useState(postsPagination.next_page)

  async function handleNextPost(): Promise<void> {
    const postResult = await fetch(`${postsPagination.next_page}`).then(response => 
      response.json()
    );
    
    const newPost = postResult.results.map(post => {
      return {
        uid: post.uid,
        first_publication_date: format(new Date(post.first_publication_date), 'dd MMM yyyy', 
        {
          locale: ptBR,
        }),
        data: {
          title: post.data.title,
          author: post.data.author,
          subtitle: post.data.subtitle,
        }, 
      }
    })

    setNextPage(postResult.next_page);
    setPosts([...posts, ...newPost])

  }

  return (
    <>
      <Head>
        <title>Home | spacetravelling</title>
      </Head>
      <Header />
      <main className={commonStyles.container}>
      <div className={styles.container}>
        {posts.map(post => {
          return (
            <Link href={`/post/${post.uid}`} key={post.uid}>
            <a>
              <strong>{post.data.title}</strong>
              <p>{post.data.subtitle}</p>
              <div className={styles.infos}>
                <div className={styles.createdAt}>
                  <FiCalendar />
                  <time>{post.first_publication_date}</time>
                </div>
                <div className={styles.author}>
                  <FiUser />
                  {post.data.author}
                </div> 
              </div>
            </a>
          </Link>
          );   
        })}

        {nextPage && 
          <button type="button" onClick={handleNextPost}>
            Carregar mais posts
          </button>
        }
      </div>    
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query([
    Prismic.predicates.at('document.type', 'post')
  ], {
    orderings: '[post.last_publication_date desc]',
    pageSize: 1,
  });

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        author: post.data.author,
        subtitle: post.data.subtitle,
      }, 
    }
  })

  const postsPagination = {
    next_page: postsResponse.next_page,
    results: posts
  }

  return {
    props: { postsPagination },
    revalidate: 60 * 30     // 30 minutos
  }
};
